from __future__ import annotations

import logging
import os
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

from gadget_state import GadgetState
from hid_mode_state import HIDModeState


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("OpenArcade")

DEFAULT_GADGET_SCRIPT = "/opt/openarcade/app/firmware/rpi/hidscript.sh"
GADGET_SCRIPT_ENV_VAR = "OPENARCADE_GADGET_SCRIPT"
GADGET_POLL_INTERVAL_ENV_VAR = "OPENARCADE_GADGET_POLL_INTERVAL"
DEFAULT_GADGET_POLL_INTERVAL = 0.5

MODE_TO_PERSONA = {
    "keyboard": "pc",
    "gamepad_pc": "pc",
    "gamepad_switch_hori": "switch-hori",
}


def resolve_gadget_script() -> str:
    return os.environ.get(GADGET_SCRIPT_ENV_VAR, DEFAULT_GADGET_SCRIPT)


def resolve_poll_interval() -> float:
    raw_value = os.environ.get(GADGET_POLL_INTERVAL_ENV_VAR)
    if raw_value in (None, ""):
        return DEFAULT_GADGET_POLL_INTERVAL
    try:
        value = float(raw_value)
        return value if value > 0 else DEFAULT_GADGET_POLL_INTERVAL
    except ValueError:
        return DEFAULT_GADGET_POLL_INTERVAL


def build_gadget(persona: str, script_path: str) -> None:
    logger.info("Rebuilding USB gadget persona: %s", persona)
    subprocess.run([script_path, persona], check=True)


def wait_for_persona_device(persona: str, timeout: float = 5.0) -> None:
    if persona == "pc":
        required_paths = (Path("/dev/hidg0"), Path("/dev/hidg1"))
    else:
        required_paths = (Path("/dev/hidg0"),)

    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if all(path.exists() for path in required_paths):
            logger.info(
                "USB gadget persona %s is ready (%s)",
                persona,
                ", ".join(str(path) for path in required_paths),
            )
            return
        time.sleep(0.1)

    logger.warning(
        "Timed out waiting for gadget persona %s device nodes: %s",
        persona,
        ", ".join(str(path) for path in required_paths),
    )


def gadget_mode_manager_main() -> int:
    script_path = resolve_gadget_script()
    poll_interval = resolve_poll_interval()
    hid_mode_state = HIDModeState()
    gadget_state = GadgetState()
    stop_event = threading.Event()

    def _handle_signal(_signum: int, _frame: object) -> None:
        stop_event.set()

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    current_persona: str | None = None
    last_sequence = -1
    hid_mode_state.ensure_initialized()
    gadget_state.ensure_initialized()

    logger.info("Starting gadget mode manager with script %s", script_path)

    while not stop_event.is_set():
        try:
            state = hid_mode_state.load()
            active_mode = state["active_mode"]
            sequence = int(state.get("sequence", 0))
            target_persona = MODE_TO_PERSONA.get(active_mode, "pc")

            if target_persona != current_persona or sequence != last_sequence:
                if target_persona != current_persona:
                    gadget_state.save(
                        persona=target_persona,
                        ready=False,
                        mode_sequence=sequence,
                    )
                    build_gadget(target_persona, script_path)
                    wait_for_persona_device(target_persona)
                    logger.info(
                        "USB gadget persona changed: %s -> %s (mode=%s seq=%s)",
                        current_persona,
                        target_persona,
                        active_mode,
                        sequence,
                    )
                    current_persona = target_persona

                gadget_state.save(
                    persona=target_persona,
                    ready=True,
                    mode_sequence=sequence,
                )
                last_sequence = sequence
        except subprocess.CalledProcessError as exc:
            logger.error("Gadget rebuild failed: %s", exc)
            time.sleep(1.0)
        except Exception as exc:
            logger.error("Gadget mode manager error: %s", exc, exc_info=True)
            time.sleep(1.0)

        stop_event.wait(poll_interval)

    logger.info("Gadget mode manager exiting")
    return 0


if __name__ == "__main__":
    raise SystemExit(gadget_mode_manager_main())
