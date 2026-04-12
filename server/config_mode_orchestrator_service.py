from __future__ import annotations

import argparse
import logging
import os
import signal
import threading
from typing import Any

from config_mode_state import ConfigModeState
from config_portal_service import (
    ConfigPortalService,
    resolve_portal_host,
    resolve_portal_index_file,
    resolve_portal_port,
    resolve_portal_static_dir,
)
from hotspot_manager import HotspotManager


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("OpenArcade")

OPENARCADE_CONFIG_MODE_ORCHESTRATOR_POLL_INTERVAL_ENV_VAR = (
    "OPENARCADE_CONFIG_MODE_ORCHESTRATOR_POLL_INTERVAL"
)
DEFAULT_CONFIG_MODE_ORCHESTRATOR_POLL_INTERVAL = 0.5


def resolve_poll_interval() -> float:
    raw = os.environ.get(OPENARCADE_CONFIG_MODE_ORCHESTRATOR_POLL_INTERVAL_ENV_VAR)
    if not raw:
        return DEFAULT_CONFIG_MODE_ORCHESTRATOR_POLL_INTERVAL

    try:
        value = float(raw)
        if value <= 0:
            raise ValueError("must be > 0")
        return value
    except ValueError:
        logger.warning(
            "Invalid %s='%s', using default %.2fs",
            OPENARCADE_CONFIG_MODE_ORCHESTRATOR_POLL_INTERVAL_ENV_VAR,
            raw,
            DEFAULT_CONFIG_MODE_ORCHESTRATOR_POLL_INTERVAL,
        )
        return DEFAULT_CONFIG_MODE_ORCHESTRATOR_POLL_INTERVAL


class ConfigModeOrchestrator:
    def __init__(
        self,
        config_mode_state: ConfigModeState | None = None,
        portal_service: ConfigPortalService | None = None,
        hotspot_manager: HotspotManager | None = None,
        poll_interval: float | None = None,
    ) -> None:
        self.config_mode_state = config_mode_state or ConfigModeState()

        config_path = os.environ.get("OPENARCADE_CONFIG_PATH")
        self.portal_service = portal_service or ConfigPortalService(
            host=resolve_portal_host(),
            port=resolve_portal_port(),
            config_path=config_path,
            static_dir=resolve_portal_static_dir(),
            index_file=resolve_portal_index_file(),
        )

        self.hotspot_manager = hotspot_manager or HotspotManager()
        self.poll_interval = poll_interval or resolve_poll_interval()

        self._lock = threading.RLock()
        self._active = False
        self._last_sequence = -1

    @property
    def is_active(self) -> bool:
        with self._lock:
            return self._active

    def run(self, stop_event: threading.Event | None = None) -> int:
        local_stop_event = stop_event or threading.Event()

        initial_state = self.config_mode_state.ensure_initialized()
        self._last_sequence = int(initial_state.get("sequence", 0))
        initial_enabled = bool(initial_state.get("enabled", False))

        logger.info(
            "Config mode orchestrator initialized enabled=%s sequence=%s",
            initial_enabled,
            self._last_sequence,
        )
        try:
            self.reconcile(initial_enabled)
        except Exception:
            logger.exception("Failed to apply initial config mode state")

        while not local_stop_event.is_set():
            try:
                current_state = self.config_mode_state.load(use_cache=False)
                sequence = int(current_state.get("sequence", 0))
                enabled = bool(current_state.get("enabled", False))

                if sequence != self._last_sequence:
                    logger.info(
                        "Config mode state changed enabled=%s sequence=%s source=%s",
                        enabled,
                        sequence,
                        current_state.get("source", "unknown"),
                    )
                    self._last_sequence = sequence
                    self.reconcile(enabled)
                elif enabled and (
                    not self.hotspot_manager.is_running or not self.portal_service.is_running
                ):
                    logger.warning(
                        "Config mode stack degraded (hotspot_running=%s portal_running=%s), reapplying",
                        self.hotspot_manager.is_running,
                        self.portal_service.is_running,
                    )
                    self.reconcile(True)
            except Exception:
                logger.exception("Config mode orchestrator loop error")

            local_stop_event.wait(self.poll_interval)

        try:
            self.reconcile(False)
        except Exception:
            logger.exception("Failed to stop config mode stack during shutdown")

        logger.info("Config mode orchestrator exiting")
        return 0

    def reconcile(self, enabled: bool) -> None:
        with self._lock:
            if enabled:
                self._enter_config_mode()
            else:
                self._exit_config_mode()

    def _enter_config_mode(self) -> None:
        if self._active and self.hotspot_manager.is_running and self.portal_service.is_running:
            return

        logger.info("Entering config mode: starting hotspot then portal")

        self.hotspot_manager.start()
        try:
            self.portal_service.start()
        except Exception:
            logger.exception("Failed to start config portal, rolling back hotspot")
            self.hotspot_manager.stop()
            self._active = False
            raise

        self._active = True

    def _exit_config_mode(self) -> None:
        if not self._active and not self.portal_service.is_running and not self.hotspot_manager.is_running:
            return

        logger.info("Exiting config mode: stopping portal then hotspot")
        try:
            self.portal_service.stop()
        finally:
            self.hotspot_manager.stop()
            self._active = False


def run(poll_interval: float | None = None) -> int:
    stop_event = threading.Event()

    def _handle_signal(signum: int, _frame: Any) -> None:
        logger.info("Received signal %s, stopping config mode orchestrator", signum)
        stop_event.set()

    previous_sigterm = signal.getsignal(signal.SIGTERM)
    previous_sigint = signal.getsignal(signal.SIGINT)

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    orchestrator = ConfigModeOrchestrator(poll_interval=poll_interval)

    try:
        return orchestrator.run(stop_event=stop_event)
    finally:
        signal.signal(signal.SIGTERM, previous_sigterm)
        signal.signal(signal.SIGINT, previous_sigint)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="OpenArcade config mode orchestrator (hotspot + portal)"
    )
    parser.add_argument(
        "--poll-interval",
        type=float,
        default=resolve_poll_interval(),
        help="State polling interval in seconds",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging",
    )
    args = parser.parse_args()

    if args.poll_interval <= 0:
        parser.error("--poll-interval must be > 0")

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    return run(poll_interval=args.poll_interval)


if __name__ == "__main__":
    raise SystemExit(main())
