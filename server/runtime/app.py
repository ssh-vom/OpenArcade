from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Protocol

from device_config_store import DeviceConfigStore

from .control_server import RuntimeControlServer
from .discovery import DiscoveryService
from .report_builder import build_mapping_cache, build_keyboard_report
from .sessions import SessionSupervisor
from .state_reducer import StateReducer


logger = logging.getLogger("OpenArcade")


class ReportSink(Protocol):
    def publish(self, report: bytes | None) -> None: ...


class RuntimeApplication:
    def __init__(self, report_sink: ReportSink, config_path: str | None = None) -> None:
        self._config_store = DeviceConfigStore(path=config_path)
        initial_config = self._config_store.load()
        self._state_reducer = StateReducer(build_mapping_cache(initial_config))
        self._report_sink = report_sink
        self._shutdown_event = asyncio.Event()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._pending_report: bytes | None = None
        self._publish_scheduled = False
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
        self._loop = asyncio.get_running_loop()
        self._report_sink.publish(self._state_reducer.build_report())

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
            self._report_sink.publish(build_keyboard_report([]))
            await self._discovery.stop()
            await sessions_task
            await self._control_server.stop()
            logger.info("Runtime stopped")

    async def _reload_config(self) -> None:
        config_snapshot = await asyncio.to_thread(self._config_store.load)
        report = self._state_reducer.set_mapping_cache(
            build_mapping_cache(config_snapshot)
        )
        self._schedule_report_publish(report)

    def _handle_state_update(self, device_id: str, state: int) -> None:
        self._state_sequence += 1
        self._live_states[device_id] = {
            "state": state,
            "seq": self._state_sequence,
            "updated_at": time.time(),
        }
        report = self._state_reducer.update_device_state(device_id, state)
        self._schedule_report_publish(report)

    def _handle_session_stopped(self, device_id: str) -> None:
        self._live_states.pop(device_id, None)
        report = self._state_reducer.remove_device_state(device_id)
        self._schedule_report_publish(report)

    def _schedule_report_publish(self, report: bytes | None) -> None:
        if report is None:
            return

        self._pending_report = report
        if self._publish_scheduled or self._loop is None:
            return

        self._publish_scheduled = True
        self._loop.call_soon(self._publish_pending_report)

    def _publish_pending_report(self) -> None:
        self._publish_scheduled = False
        report = self._pending_report
        self._pending_report = None
        if report is None:
            return

        try:
            self._report_sink.publish(report)
        except Exception:
            logger.exception("Failed to publish HID report")

    def _get_connected_devices(self) -> set[str]:
        return self._sessions.connected_addresses

    def _get_device_states(self) -> dict[str, dict[str, Any]]:
        return {
            device_id: dict(state) for device_id, state in self._live_states.items()
        }
