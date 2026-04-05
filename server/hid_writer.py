from __future__ import annotations

import logging
import os
import sys
import time
from typing import Any

from hid_mode_state import HIDModeState, HIDMode


logger = logging.getLogger("OpenArcade")


def set_cpu_affinity(core_id: int) -> None:
    """Pin this process to a specific CPU core."""
    try:
        os.sched_setaffinity(0, {core_id})
        logger.info(f"Pinned to CPU core {core_id}")
    except Exception as exc:
        logger.warning(f"Could not set CPU affinity: {exc}")


def hid_writer_process(
    mailbox: dict[str, Any],
    stop_event: Any,
    cpu_core: int = 1,
):
    """HID output process pinned to a specific CPU core."""
    
    # Pin to specific CPU core immediately
    set_cpu_affinity(cpu_core)
    
    logger.info("HID Writer Process Started on core %d", cpu_core)

    report_array = mailbox["report_array"]
    report_version = mailbox["report_version"]
    report_event = mailbox["report_event"]

    # HID device paths for different modes
    hid_keyboard_path = "/dev/hidg0"
    hid_gamepad_path = "/dev/hidg1"
    
    use_mock = False
    hid_keyboard_device = None
    hid_gamepad_device = None
    
    # HID mode state tracker
    hid_mode_state = HIDModeState()
    initial_mode_state = hid_mode_state.load()
    current_mode: HIDMode = initial_mode_state["active_mode"]
    last_mode_sequence = initial_mode_state["sequence"]

    # Try to open HID devices
    try:
        hid_keyboard_device = open(hid_keyboard_path, "wb", buffering=0)
        logger.info("Opened keyboard HID interface: %s", hid_keyboard_path)
    except (FileNotFoundError, PermissionError, OSError) as e:
        logger.warning(f"Keyboard HID interface not available: {e}")
    
    try:
        hid_gamepad_device = open(hid_gamepad_path, "wb", buffering=0)
        logger.info("Opened gamepad HID interface: %s", hid_gamepad_path)
    except (FileNotFoundError, PermissionError, OSError) as e:
        logger.warning(f"Gamepad HID interface not available: {e}")
    
    # If neither device is available, use mock mode
    if hid_keyboard_device is None and hid_gamepad_device is None:
        use_mock = True
        logger.warning(
            "No HID interfaces available. Using MOCK mode (stdout)."
        )

    last_seen_version = 0

    while not stop_event.is_set():
        # Wait for new data signal (with timeout to check stop_event periodically)
        report_event.wait(timeout=0.5)
        
        if stop_event.is_set():
            break
        
        # Check for mode changes
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
                    f"HID writer detected mode change: {current_mode} -> {new_mode} "
                    f"(seq: {last_mode_sequence} -> {mode_sequence})"
                )
                current_mode = new_mode
                last_mode_sequence = mode_sequence
        except Exception as e:
            logger.error(f"Error checking HID mode: {e}", exc_info=True)
            
        # Check if there's new data
        current_version = report_version.value
        if current_version == last_seen_version:
            continue
            
        last_seen_version = current_version
        
        # Read the current report from shared memory
        report = bytes(report_array)
        
        # Clear the event flag (we'll wait for next signal)
        report_event.clear()

        # Select the appropriate HID device based on current mode
        if current_mode == "keyboard":
            target_device = hid_keyboard_device
            device_name = "keyboard"
        else:
            target_device = hid_gamepad_device
            device_name = "gamepad"

        try:
            if use_mock:
                # Mock output with mode indicator
                if current_mode == "keyboard":
                    keys = [f"0x{key:02X}" for key in report[2:] if key != 0]
                    output = f"\r[KB] Mod: 0x{report[0]:02X} | Keys: {keys}" + " " * 20
                else:
                    buttons = report[0] | (report[1] << 8)
                    dpad = report[2]
                    output = f"\r[GP] Buttons: 0x{buttons:04X} | D-Pad: {dpad}" + " " * 20
                sys.stdout.write(output)
                sys.stdout.flush()
            elif target_device is not None:
                target_device.write(report)
            else:
                logger.warning(f"No HID device available for {device_name} mode")
                
        except Exception as exc:
            logger.error("HID write error (%s): %s", device_name, exc)
            time.sleep(1.0)

    # Cleanup: send neutral reports and close devices
    neutral_keyboard_report = bytes([0] * 8)
    neutral_gamepad_report = bytes([0, 0, 15, 0x80, 0x80, 0x80, 0x80, 0])
    
    if hid_keyboard_device is not None:
        try:
            hid_keyboard_device.write(neutral_keyboard_report)
            hid_keyboard_device.close()
        except OSError:
            pass
    
    if hid_gamepad_device is not None:
        try:
            hid_gamepad_device.write(neutral_gamepad_report)
            hid_gamepad_device.close()
        except OSError:
            pass

    logger.info("HID Writer Process Exiting")
