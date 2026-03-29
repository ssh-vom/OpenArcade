from __future__ import annotations

import asyncio
import logging
import queue
import time
from multiprocessing.queues import Queue
from typing import Any

from device_config_store import DeviceConfigStore

from .control_server import RuntimeControlServer
from .discovery import DiscoveryService
from .report_builder import build_mapping_cache, build_keyboard_report
from .sessions import SessionSupervisor
from .state_reducer import StateReducer


logger = logging.getLogger("OpenArcade")


class LatestReportPublisher:
    def __init__(self, report_queue: Queue) -> None:
        self._report_queue = report_queue
        self._last_report: bytes | None = None

    def publish(self, report: bytes | None) -> None:
        if report is None or report == self._last_report:
            return

        self._last_report = report

        while True:
            try:
                self._report_queue.put_nowait(report)
                return
            except queue.Full:
                try:
                    self._report_queue.get_nowait()
                except queue.Empty:
                    continue


class RuntimeApplication:
    def __init__(self, report_queue: Queue, config_path: str | None = None) -> None:
        self._config_store = DeviceConfigStore(path=config_path)
        initial_config = self._config_store.load()
        self._state_reducer = StateReducer(build_mapping_cache(initial_config))
        self._report_publisher = LatestReportPublisher(report_queue)
        self._shutdown_event = asyncio.Event()
        self._live_states: dict[str, dict[str, Any]] = {}
        self._state_sequence = 0
        self._discovered_devices: asyncio.Queue[Any] = asyncio.Queue()
        self._discovery = DiscoveryService(self._discovered_devices)
        self._sessions = SessionSupervisor(
            discovered_devices=self._discovered_devices,
            stop_event=self._shutdown_event,
            on_state_update=self._handle_state_update,
            on_session_stopped=self._handle_session_stopped,
            pause_discovery=self._discovery.pause,
            resume_discovery=self._discovery.resume,
        )
        self._control_server = RuntimeControlServer(
            on_config_updated=self._reload_config,
            get_connected_devices=self._get_connected_devices,
            get_device_states=self._get_device_states,
        )

    async def run(self, shutdown_signal: asyncio.Event) -> None:
        logger.info("Runtime started")
        self._report_publisher.publish(self._state_reducer.build_report())

        await self._control_server.start()
        await self._discovery.start()
        sessions_task = asyncio.create_task(
            self._sessions.run(),
            name="session-supervisor",
        )

        try:
            await shutdown_signal.wait()
        finally:
            logger.info("Runtime stopping")
            self._shutdown_event.set()
            self._report_publisher.publish(build_keyboard_report([]))
            await self._discovery.stop()
            await sessions_task
            await self._control_server.stop()
            logger.info("Runtime stopped")

    async def _reload_config(self) -> None:
        config_snapshot = await asyncio.to_thread(self._config_store.load)
        report = self._state_reducer.set_mapping_cache(
            build_mapping_cache(config_snapshot)
        )
        self._report_publisher.publish(report)

    def _handle_state_update(self, device_id: str, state: int) -> None:
        self._state_sequence += 1
        self._live_states[device_id] = {
            "state": state,
            "seq": self._state_sequence,
            "updated_at": time.time(),
        }
        report = self._state_reducer.update_device_state(device_id, state)
        self._report_publisher.publish(report)

    def _handle_session_stopped(self, device_id: str) -> None:
        self._live_states.pop(device_id, None)
        report = self._state_reducer.remove_device_state(device_id)
        self._report_publisher.publish(report)

    def _get_connected_devices(self) -> set[str]:
        return self._sessions.connected_addresses

    def _get_device_states(self) -> dict[str, dict[str, Any]]:
        return {
            device_id: dict(state) for device_id, state in self._live_states.items()
        }
