from __future__ import annotations

import asyncio
import logging
import threading
import time
from collections.abc import Callable
from typing import Any

from constants import SCANNER_DELAY

from .device_session import DeviceSession, StateUpdateCallback
from .discovery import DiscoveryService


logger = logging.getLogger("OpenArcade")

SessionStoppedCallback = Callable[[str], None]


class DeviceSessionWorker(threading.Thread):
    def __init__(
        self,
        device: Any,
        shutdown_event: threading.Event,
        connect_gate: threading.Semaphore,
        on_state_update: StateUpdateCallback,
        on_connected: Callable[[str], None],
        on_stopped: Callable[[str, bool], None],
    ) -> None:
        address = str(getattr(device, "address", device))
        super().__init__(name=f"device-session:{address}", daemon=True)
        self.device = device
        self.address = address
        self._shutdown_event = shutdown_event
        self._connect_gate = connect_gate
        self._on_state_update = on_state_update
        self._on_connected = on_connected
        self._on_stopped = on_stopped
        self._connected = False

    def run(self) -> None:
        try:
            asyncio.run(self._run())
        except Exception:
            logger.exception("Session worker crashed for %s", self.address)

    async def _run(self) -> None:
        session_stop_event = asyncio.Event()
        session = DeviceSession(
            device=self.address,
            stop_event=session_stop_event,
            on_state_update=self._on_state_update,
        )

        async def bridge_shutdown() -> None:
            await asyncio.to_thread(self._shutdown_event.wait)
            session_stop_event.set()

        shutdown_bridge_task = asyncio.create_task(bridge_shutdown())
        connect_gate_acquired = False

        try:
            try:
                await asyncio.to_thread(self._connect_gate.acquire)
                connect_gate_acquired = True
                logger.info("Connecting to %s", self.address)
                await session.connect()
            except Exception as exc:
                logger.error(
                    "Device session error for %s: %s. Retrying after %ss",
                    self.address,
                    exc,
                    SCANNER_DELAY,
                )
                return
            finally:
                if connect_gate_acquired:
                    self._connect_gate.release()

            self._connected = True
            self._on_connected(self.address)
            logger.info("Connected to %s", self.address)
            await session.wait_closed()
        finally:
            shutdown_bridge_task.cancel()
            await asyncio.gather(shutdown_bridge_task, return_exceptions=True)
            try:
                await session.disconnect()
            except Exception as exc:
                logger.warning("Disconnect cleanup failed for %s: %s", self.address, exc)
            self._on_stopped(self.address, self._connected)


class SessionSupervisor:
    def __init__(
        self,
        on_state_update: StateUpdateCallback,
        on_session_stopped: SessionStoppedCallback,
    ) -> None:
        self._on_state_update = on_state_update
        self._on_session_stopped = on_session_stopped
        self._app_loop: asyncio.AbstractEventLoop | None = None
        self._shutdown_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._state_lock = threading.Lock()
        self._known_devices: dict[str, Any] = {}
        self._session_workers: dict[str, DeviceSessionWorker] = {}
        self._connected_addresses: set[str] = set()
        self._retry_after: dict[str, float] = {}
        self._connect_gate = threading.Semaphore(1)

    @property
    def connected_addresses(self) -> set[str]:
        with self._state_lock:
            return set(self._connected_addresses)

    def start(self, app_loop: asyncio.AbstractEventLoop) -> None:
        if self._thread is not None:
            return

        self._app_loop = app_loop
        self._shutdown_event.clear()
        self._thread = threading.Thread(
            target=self._run_control_plane_thread,
            name="BLEControlPlane",
            daemon=True,
        )
        self._thread.start()

    def stop(self) -> None:
        self._shutdown_event.set()

    async def wait_closed(self) -> None:
        thread = self._thread
        if thread is None:
            return

        await asyncio.to_thread(thread.join, 5.0)
        self._thread = None

    def _run_control_plane_thread(self) -> None:
        try:
            asyncio.run(self._control_plane_main())
        except Exception:
            logger.exception("BLE control plane crashed")

    async def _control_plane_main(self) -> None:
        discovered_devices: asyncio.Queue[Any] = asyncio.Queue()
        discovery = DiscoveryService(discovered_devices)

        try:
            await discovery.start()
            logger.info("BLE control plane started")

            while not self._shutdown_event.is_set():
                try:
                    device = await asyncio.wait_for(discovered_devices.get(), timeout=0.5)
                except TimeoutError:
                    continue
                self._schedule_session(device)
        finally:
            self._shutdown_event.set()
            await discovery.stop()
            workers = self._current_workers()
            for worker in workers:
                worker.join(timeout=5.0)
            logger.info("BLE control plane stopped")

    def _schedule_session(self, device: Any) -> None:
        address = str(getattr(device, "address", device))
        now = time.monotonic()

        with self._state_lock:
            self._known_devices[address] = device

            if address in self._session_workers:
                return
            if now < self._retry_after.get(address, 0.0):
                return

            worker = DeviceSessionWorker(
                device=address,
                shutdown_event=self._shutdown_event,
                connect_gate=self._connect_gate,
                on_state_update=self._forward_state_update,
                on_connected=self._handle_worker_connected,
                on_stopped=self._handle_worker_stopped,
            )
            self._session_workers[address] = worker

        logger.info("Discovered target device %s", address)
        worker.start()

    def _forward_state_update(self, address: str, state: int) -> None:
        loop = self._app_loop
        if loop is None or loop.is_closed():
            return

        loop.call_soon_threadsafe(self._on_state_update, address, state)

    def _handle_worker_connected(self, address: str) -> None:
        with self._state_lock:
            self._connected_addresses.add(address)

    def _handle_worker_stopped(self, address: str, connected: bool) -> None:
        with self._state_lock:
            self._connected_addresses.discard(address)
            self._session_workers.pop(address, None)
            self._known_devices.pop(address, None)
            if not self._shutdown_event.is_set():
                self._retry_after[address] = time.monotonic() + SCANNER_DELAY

        if connected and not self._shutdown_event.is_set():
            logger.warning("Disconnected from %s", address)

        loop = self._app_loop
        if loop is None or loop.is_closed():
            return

        loop.call_soon_threadsafe(self._on_session_stopped, address)

    def _current_workers(self) -> list[DeviceSessionWorker]:
        with self._state_lock:
            return list(self._session_workers.values())
