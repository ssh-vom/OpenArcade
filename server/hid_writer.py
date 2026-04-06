from __future__ import annotations

import logging
import os
import stat
import sys
import time
from typing import Any

from gadget_state import GadgetPersona, GadgetState
from hid_mode_state import HIDMode, HIDModeState
from runtime.report_builder import (
    build_gamepad_pc_report,
    build_gamepad_switch_hori_report,
    build_keyboard_report,
)


logger = logging.getLogger("OpenArcade")

REPORT_LENGTH_BY_MODE: dict[HIDMode, int] = {
    "keyboard": 8,
    "gamepad_pc": 8,
    "gamepad_switch_hori": 8,  # 8-byte HID report (USB endpoint size is 64, but report is 8)
}

MODE_DEVICE_CANDIDATES: dict[HIDMode, tuple[str, ...]] = {
    "keyboard": ("/dev/hidg0",),
    "gamepad_pc": ("/dev/hidg1",),
    "gamepad_switch_hori": ("/dev/hidg0", "/dev/hidg1"),
}

MODE_TAGS: dict[HIDMode, str] = {
    "keyboard": "KB",
    "gamepad_pc": "GP",
    "gamepad_switch_hori": "SW",
}

REOPEN_SETTLE_SECONDS = 0.6
MODE_TO_REQUIRED_PERSONA: dict[HIDMode, GadgetPersona] = {
    "keyboard": "pc",
    "gamepad_pc": "pc",
    "gamepad_switch_hori": "switch-hori",
}


def set_cpu_affinity(core_id: int) -> None:
    try:
        os.sched_setaffinity(0, {core_id})
        logger.info("Pinned to CPU core %d", core_id)
    except Exception as exc:
        logger.warning("Could not set CPU affinity: %s", exc)


def _neutral_report_for_mode(mode: HIDMode) -> bytes:
    if mode == "keyboard":
        return build_keyboard_report([])
    if mode == "gamepad_switch_hori":
        return build_gamepad_switch_hori_report([])
    return build_gamepad_pc_report([])


def _trim_report_for_mode(mode: HIDMode, report: bytes) -> bytes:
    report_length = REPORT_LENGTH_BY_MODE.get(mode, 8)
    return report[:report_length]


def hid_writer_process(
    mailbox: dict[str, Any],
    stop_event: Any,
    cpu_core: int = 1,
):
    set_cpu_affinity(cpu_core)
    logger.info("HID Writer Process Started on core %d", cpu_core)

    report_array = mailbox["report_array"]
    report_version = mailbox["report_version"]
    report_event = mailbox["report_event"]

    hid_mode_state = HIDModeState()
    gadget_state = GadgetState()
    initial_mode_state = hid_mode_state.load()
    current_mode: HIDMode = initial_mode_state["active_mode"]
    last_mode_sequence = initial_mode_state["sequence"]

    use_mock = False
    opened_devices: dict[str, Any] = {}
    current_device = None
    current_device_path: str | None = None
    last_seen_version = 0
    pending_report: bytes | None = None

    def close_all_devices() -> None:
        nonlocal current_device, current_device_path
        for path, handle in list(opened_devices.items()):
            try:
                handle.close()
            except OSError:
                pass
            opened_devices.pop(path, None)
        current_device = None
        current_device_path = None

    def open_mode_device(mode: HIDMode):
        nonlocal use_mock, current_device, current_device_path

        for path in MODE_DEVICE_CANDIDATES[mode]:
            try:
                path_stat = os.stat(path)
                if not stat.S_ISCHR(path_stat.st_mode):
                    logger.warning(
                        "Refusing to open non-character HID path for %s mode: %s (mode=%o)",
                        mode,
                        path,
                        path_stat.st_mode,
                    )
                    continue
                fd = os.open(path, os.O_WRONLY | os.O_NONBLOCK)
                handle = os.fdopen(fd, "wb", buffering=0)
                opened_devices[path] = handle
                current_device = handle
                current_device_path = path
                use_mock = False
                inode_info = f"inode={path_stat.st_ino} dev={path_stat.st_dev}"
                logger.info("Opened HID interface for %s mode: %s (%s)", mode, path, inode_info)
                return handle
            except (FileNotFoundError, PermissionError, OSError) as exc:
                logger.debug("HID path not ready for %s mode (%s): %s", mode, path, exc)

        if not opened_devices:
            use_mock = True
        current_device = None
        current_device_path = None
        return None

    def gadget_ready_for_mode(mode: HIDMode) -> bool:
        state = gadget_state.load()
        required_persona = MODE_TO_REQUIRED_PERSONA[mode]
        ready = bool(state.get("ready"))
        persona = state.get("persona")
        mode_sequence = int(state.get("mode_sequence", -1))
        is_ready = (
            ready
            and persona == required_persona
            and mode_sequence >= last_mode_sequence
        )
        logger.info(
            "Gadget readiness check mode=%s required_persona=%s persona=%s ready=%s mode_sequence=%s last_mode_sequence=%s result=%s",
            mode,
            required_persona,
            persona,
            ready,
            mode_sequence,
            last_mode_sequence,
            is_ready,
        )
        return is_ready

    def _device_node_matches_current_path(path: str) -> bool:
        try:
            path_stat = os.stat(path)
        except OSError:
            return False
        return stat.S_ISCHR(path_stat.st_mode)

    def ensure_mode_device(mode: HIDMode):
        if not gadget_ready_for_mode(mode):
            close_all_devices()
            return None
        if (
            current_device_path in MODE_DEVICE_CANDIDATES[mode]
            and current_device is not None
            and not current_device.closed
            and current_device_path is not None
            and _device_node_matches_current_path(current_device_path)
        ):
            return current_device
        return open_mode_device(mode)

    def write_report(mode: HIDMode, report: bytes) -> bool:
        nonlocal current_device, current_device_path
        target_report = _trim_report_for_mode(mode, report)
        target_device = ensure_mode_device(mode)
        tag = MODE_TAGS[mode]

        if use_mock and target_device is None:
            if mode == "keyboard":
                keys = [f"0x{key:02X}" for key in target_report[2:] if key != 0]
                output = f"\r[{tag}] Mod: 0x{target_report[0]:02X} | Keys: {keys}" + " " * 20
            else:
                buttons = target_report[0] | (target_report[1] << 8)
                dpad = target_report[2]
                output = f"\r[{tag}] Buttons: 0x{buttons:04X} | HAT: {dpad}" + " " * 20
            sys.stdout.write(output)
            sys.stdout.flush()
            return True

        if target_device is None:
            logger.warning("No HID device available for %s mode; waiting for gadget readiness/re-enumeration", mode)
            return False

        try:
            target_device.write(target_report)
            logger.info(
                "HID write ok mode=%s path=%s bytes=%s",
                mode,
                current_device_path,
                target_report[:8].hex(),
            )
            return True
        except Exception as exc:
            logger.warning("HID write error (%s @ %s): %s", mode, current_device_path, exc)
            if current_device_path is not None:
                handle = opened_devices.pop(current_device_path, None)
                if handle is not None:
                    try:
                        handle.close()
                    except OSError:
                        pass
            current_device = None
            time.sleep(0.2)
            return False

    # Best-effort initial open, but only after gadget manager has marked the persona ready.
    if gadget_ready_for_mode(current_mode):
        open_mode_device(current_mode)
    if current_device is None:
        logger.warning("No HID interfaces available on startup. Writer will retry dynamically.")

    while not stop_event.is_set():
        report_event.wait(timeout=0.5)
        if stop_event.is_set():
            break

        if pending_report is not None and current_device is None:
            if write_report(current_mode, pending_report):
                pending_report = None

        try:
            mode_state = hid_mode_state.load()
            mode_sequence = mode_state["sequence"]
            new_mode: HIDMode = mode_state["active_mode"]
            if mode_sequence < last_mode_sequence:
                logger.warning(
                    "Ignoring stale HID mode state in writer: %s -> %s (seq: %s -> %s)",
                    current_mode,
                    new_mode,
                    last_mode_sequence,
                    mode_sequence,
                )
            elif mode_sequence != last_mode_sequence or new_mode != current_mode:
                logger.info(
                    "HID writer detected mode change: %s -> %s (seq: %s -> %s)",
                    current_mode,
                    new_mode,
                    last_mode_sequence,
                    mode_sequence,
                )
                # Force all HID gadget file descriptors to be reopened after a mode
                # change. This is especially important when transitioning into or out
                # of Switch persona, because gadget re-enumeration destroys and recreates
                # /dev/hidg* nodes and old file descriptors become stale.
                close_all_devices()
                current_mode = new_mode
                last_mode_sequence = mode_sequence
                time.sleep(REOPEN_SETTLE_SECONDS)
                if gadget_ready_for_mode(current_mode):
                    open_mode_device(current_mode)
                else:
                    logger.info("Deferring HID reopen until gadget manager marks persona ready for mode=%s", current_mode)
        except Exception as exc:
            logger.error("Error checking HID mode: %s", exc, exc_info=True)

        current_version = report_version.value
        if current_version == last_seen_version:
            continue
        last_seen_version = current_version

        report = bytes(report_array)
        report_event.clear()
        if not write_report(current_mode, report):
            pending_report = report
        else:
            pending_report = None

    try:
        write_report(current_mode, _neutral_report_for_mode(current_mode))
    except Exception:
        pass
    close_all_devices()
    logger.info("HID Writer Process Exiting")
