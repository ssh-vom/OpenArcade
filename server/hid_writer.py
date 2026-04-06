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
    "gamepad_switch_hori": ("/dev/hidg0",),
}

MODE_TAGS: dict[HIDMode, str] = {
    "keyboard": "KB",
    "gamepad_pc": "GP",
    "gamepad_switch_hori": "SW",
}

REOPEN_SETTLE_SECONDS = 0.6
SWITCH_REPORT_REFRESH_SECONDS = 0.005
DEFAULT_REPORT_WAIT_SECONDS = 0.5
MODE_STATE_POLL_SECONDS = 0.1
GADGET_STATE_REFRESH_SECONDS = 0.1
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
    last_opened_mode: HIDMode | None = None
    current_report: bytes = _neutral_report_for_mode(current_mode)
    last_write_at = 0.0
    last_mode_check_at = 0.0
    last_gadget_state_check_at = 0.0
    cached_gadget_ready = False
    cached_gadget_persona: GadgetPersona | None = None
    cached_gadget_mode_sequence = -1

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
        nonlocal use_mock, current_device, current_device_path, last_opened_mode

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
                logger.debug("Opened HID interface for %s mode: %s (%s)", mode, path, inode_info)
                # Send an immediate neutral report when a freshly enumerated HID
                # device is opened so the host/browser sees at least one input
                # report even before any button state changes occur.
                try:
                    neutral = _trim_report_for_mode(mode, _neutral_report_for_mode(mode))
                    handle.write(neutral)
                    logger.debug(
                        "Sent initial neutral report for %s mode after open: %s",
                        mode,
                        neutral[:8].hex(),
                    )
                except Exception as exc:
                    logger.warning(
                        "Failed to send initial neutral report for %s mode on %s: %s",
                        mode,
                        path,
                        exc,
                    )
                last_opened_mode = mode
                return handle
            except (FileNotFoundError, PermissionError, OSError) as exc:
                logger.debug("HID path not ready for %s mode (%s): %s", mode, path, exc)

        if not opened_devices:
            use_mock = True
        current_device = None
        current_device_path = None
        return None

    def refresh_gadget_state(force: bool = False) -> None:
        nonlocal last_gadget_state_check_at
        nonlocal cached_gadget_ready, cached_gadget_persona, cached_gadget_mode_sequence

        now = time.monotonic()
        if not force and (now - last_gadget_state_check_at) < GADGET_STATE_REFRESH_SECONDS:
            return

        state = gadget_state.load()
        cached_gadget_ready = bool(state.get("ready"))
        persona = state.get("persona")
        cached_gadget_persona = persona if isinstance(persona, str) else None
        cached_gadget_mode_sequence = int(state.get("mode_sequence", -1))
        last_gadget_state_check_at = now

    def gadget_ready_for_mode(mode: HIDMode, force_refresh: bool = False) -> bool:
        refresh_gadget_state(force=force_refresh)
        required_persona = MODE_TO_REQUIRED_PERSONA[mode]
        is_ready = (
            cached_gadget_ready
            and cached_gadget_persona == required_persona
            and cached_gadget_mode_sequence >= last_mode_sequence
        )
        logger.debug(
            "Gadget readiness check mode=%s required_persona=%s persona=%s ready=%s mode_sequence=%s last_mode_sequence=%s result=%s",
            mode,
            required_persona,
            cached_gadget_persona,
            cached_gadget_ready,
            cached_gadget_mode_sequence,
            last_mode_sequence,
            is_ready,
        )
        return is_ready

    def ensure_mode_device(mode: HIDMode):
        if not gadget_ready_for_mode(mode):
            close_all_devices()
            return None
        if (
            current_device_path in MODE_DEVICE_CANDIDATES[mode]
            and current_device is not None
            and not current_device.closed
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
            logger.debug("No HID device available for %s mode; waiting for gadget readiness/re-enumeration", mode)
            return False

        try:
            target_device.write(target_report)
            logger.debug(
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
            refresh_gadget_state(force=True)
            time.sleep(0.02)
            return False

    # Best-effort initial open, but only after gadget manager has marked the persona ready.
    refresh_gadget_state(force=True)
    if gadget_ready_for_mode(current_mode):
        open_mode_device(current_mode)
    if current_device is None:
        logger.warning("No HID interfaces available on startup. Writer will retry dynamically.")

    while not stop_event.is_set():
        wait_timeout = (
            SWITCH_REPORT_REFRESH_SECONDS
            if current_mode == "gamepad_switch_hori"
            else DEFAULT_REPORT_WAIT_SECONDS
        )
        report_event.wait(timeout=wait_timeout)
        if stop_event.is_set():
            break

        # Clear event BEFORE reading version/report to avoid race condition.
        # If aggregator sets event while we're processing, we'll catch it on
        # the next iteration because the event will be set again.
        report_event.clear()

        try:
            now = time.monotonic()
            if (now - last_mode_check_at) >= MODE_STATE_POLL_SECONDS:
                last_mode_check_at = now
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
                    close_all_devices()
                    current_mode = new_mode
                    current_report = _neutral_report_for_mode(current_mode)
                    pending_report = current_report
                    last_write_at = 0.0
                    last_mode_sequence = mode_sequence
                    refresh_gadget_state(force=True)
                    time.sleep(REOPEN_SETTLE_SECONDS)
                    if gadget_ready_for_mode(current_mode, force_refresh=True):
                        open_mode_device(current_mode)
                    else:
                        logger.info("Deferring HID reopen until gadget manager marks persona ready for mode=%s", current_mode)
        except Exception as exc:
            logger.error("Error checking HID mode: %s", exc, exc_info=True)

        current_version = report_version.value
        if current_version != last_seen_version:
            last_seen_version = current_version
            current_report = bytes(report_array)
            pending_report = current_report

        report_to_write = pending_report
        should_refresh_switch_report = (
            report_to_write is None
            and current_mode == "gamepad_switch_hori"
            and (time.monotonic() - last_write_at) >= SWITCH_REPORT_REFRESH_SECONDS
        )
        if should_refresh_switch_report:
            report_to_write = current_report

        if report_to_write is None:
            continue

        if write_report(current_mode, report_to_write):
            pending_report = None
            last_write_at = time.monotonic()
        else:
            pending_report = report_to_write

    try:
        write_report(current_mode, _neutral_report_for_mode(current_mode))
    except Exception:
        pass
    close_all_devices()
    logger.info("HID Writer Process Exiting")
