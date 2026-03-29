from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Callable
from typing import Any

from constants import SCANNER_DELAY

from .device_session import DeviceSession, StateUpdateCallback


logger = logging.getLogger("OpenArcade")

SessionStoppedCallback = Callable[[str], None]


class SessionSupervisor:
    def __init__(
        self,
        discovered_devices: asyncio.Queue[Any],
        stop_event: asyncio.Event,
        on_state_update: StateUpdateCallback,
        on_session_stopped: SessionStoppedCallback,
    ) -> None:
        self._discovered_devices = discovered_devices
        self._stop_event = stop_event
        self._on_state_update = on_state_update
        self._on_session_stopped = on_session_stopped
        self._known_devices: dict[str, Any] = {}
        self._session_tasks: dict[str, asyncio.Task[None]] = {}
        self._connected_addresses: set[str] = set()
        self._retry_after: dict[str, float] = {}
        self._connect_lock = asyncio.Lock()

    @property
    def connected_addresses(self) -> set[str]:
        return set(self._connected_addresses)

    async def run(self) -> None:
        while not self._stop_event.is_set():
            try:
                device = await asyncio.wait_for(
                    self._discovered_devices.get(), timeout=0.5
                )
            except TimeoutError:
                continue
            self._schedule_session(device)

        await asyncio.gather(*self._session_tasks.values(), return_exceptions=True)

    def _schedule_session(self, device: Any) -> None:
        address = str(device.address)
        self._known_devices[address] = device

        if address in self._session_tasks:
            return
        if time.monotonic() < self._retry_after.get(address, 0.0):
            return

        logger.info("Discovered target device %s", address)
        task = asyncio.create_task(
            self._run_session(address),
            name=f"device-session:{address}",
        )
        self._session_tasks[address] = task

    async def _run_session(self, address: str) -> None:
        device = self._known_devices.get(address)
        if device is None:
            self._session_tasks.pop(address, None)
            return

        session = DeviceSession(
            device=device,
            stop_event=self._stop_event,
            on_state_update=self._on_state_update,
        )
        connected = False

        try:
            async with self._connect_lock:
                logger.info("Connecting to %s", address)
                await session.connect()
            connected = True
            self._connected_addresses.add(address)
            logger.info("Connected to %s", address)
            await session.wait_closed()
        except Exception as exc:
            logger.error(
                "Device session error for %s: %s. Retrying after %ss",
                address,
                exc,
                SCANNER_DELAY,
            )
        finally:
            self._connected_addresses.discard(address)
            if not self._stop_event.is_set():
                self._retry_after[address] = time.monotonic() + SCANNER_DELAY
                if connected:
                    logger.warning("Disconnected from %s", address)

            try:
                await session.disconnect()
            except Exception as exc:
                logger.warning("Disconnect cleanup failed for %s: %s", address, exc)

            self._on_session_stopped(address)
            self._session_tasks.pop(address, None)
            self._known_devices.pop(address, None)
