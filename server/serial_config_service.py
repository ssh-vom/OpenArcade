from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any

from device_config_store import DeviceConfigStore
from runtime.report_builder import build_control_maps, get_pressed_control_ids
from runtime_ipc import (
    get_connected_devices,
    get_device_states,
    notify_runtime_config_updated,
)


def read_line(fd: int) -> str | None:
    buffer = bytearray()
    while True:
        chunk = os.read(fd, 1)
        if not chunk:
            return None
        if chunk == b"\n":
            break
        buffer.extend(chunk)
    return buffer.decode("utf-8", errors="ignore").strip()


def write_line(fd: int, payload: dict[str, Any]) -> None:
    data = json.dumps(payload, separators=(",", ":")) + "\n"
    os.write(fd, data.encode("utf-8"))


def _handle_ping(_store: DeviceConfigStore, _message: dict[str, Any]) -> dict[str, Any]:
    return {"ok": True, "reply": "pong"}


def _handle_list_devices(
    store: DeviceConfigStore, _message: dict[str, Any]
) -> dict[str, Any]:
    data = store.get_all()
    live_connected_devices = get_connected_devices()
    devices = data.get("devices", {})
    if isinstance(devices, dict):
        for device_id, device in devices.items():
            if isinstance(device, dict):
                device["connected"] = device_id in live_connected_devices
    return {"ok": True, "devices": devices}


def _handle_get_device(
    store: DeviceConfigStore, message: dict[str, Any]
) -> dict[str, Any]:
    device_id = message.get("device_id")
    if not device_id:
        return {"ok": False, "error": "missing_device_id"}

    device = store.get_device(device_id)
    if isinstance(device, dict):
        device["connected"] = device_id in get_connected_devices()
    return {"ok": True, "device": device}


def _handle_set_descriptor(
    store: DeviceConfigStore, message: dict[str, Any]
) -> dict[str, Any]:
    device_id = message.get("device_id")
    descriptor = message.get("descriptor")
    if not device_id or descriptor is None:
        return {"ok": False, "error": "missing_fields"}
    store.set_descriptor(device_id, descriptor)
    store.save()
    return {"ok": True}


def _handle_set_device_name(
    store: DeviceConfigStore, message: dict[str, Any]
) -> dict[str, Any]:
    device_id = message.get("device_id")
    name = message.get("name")
    if not device_id or not isinstance(name, str) or not name.strip():
        return {"ok": False, "error": "missing_fields"}
    store.set_device_name(device_id, name)
    store.save()
    return {"ok": True}


def _handle_set_mapping(
    store: DeviceConfigStore, message: dict[str, Any]
) -> dict[str, Any]:
    device_id = message.get("device_id")
    mode = message.get("mode")
    control_id = message.get("control_id")
    mapping = message.get("mapping")
    if not device_id or not mode or control_id is None or mapping is None:
        return {"ok": False, "error": "missing_fields"}
    store.set_mapping(device_id, mode, str(control_id), mapping)
    store.save()
    return {"ok": True}


def _handle_set_active_mode(
    store: DeviceConfigStore, message: dict[str, Any]
) -> dict[str, Any]:
    device_id = message.get("device_id")
    mode = message.get("mode")
    if not device_id or not mode:
        return {"ok": False, "error": "missing_fields"}
    store.set_active_mode(device_id, mode)
    store.save()
    return {"ok": True}


def _handle_set_ui_binding(
    store: DeviceConfigStore, message: dict[str, Any]
) -> dict[str, Any]:
    device_id = message.get("device_id")
    ui_button = message.get("ui_button")
    control_id = message.get("control_id")
    strategy = message.get("strategy") or "swap"
    if not device_id or not ui_button or control_id is None:
        return {"ok": False, "error": "missing_fields"}

    device = store.set_ui_binding(device_id, ui_button, str(control_id), strategy)
    store.save()
    return {"ok": True, "device": device}


def _handle_list_profiles(
    store: DeviceConfigStore, message: dict[str, Any]
) -> dict[str, Any]:
    device_id = message.get("device_id")
    if not device_id:
        return {"ok": False, "error": "missing_device_id"}
    profiles = store.list_profiles(device_id)
    return {"ok": True, "profiles": profiles}


def _handle_create_profile(
    store: DeviceConfigStore, message: dict[str, Any]
) -> dict[str, Any]:
    device_id = message.get("device_id")
    name = message.get("name")
    plate_id = message.get("plate_id") or "button-module-v1"
    if not device_id or not name:
        return {"ok": False, "error": "missing_fields"}
    profile = store.create_profile(device_id, name, plate_id)
    store.save()
    return {"ok": True, "profile": profile}


def _handle_delete_profile(
    store: DeviceConfigStore, message: dict[str, Any]
) -> dict[str, Any]:
    device_id = message.get("device_id")
    profile_id = message.get("profile_id")
    if not device_id or not profile_id:
        return {"ok": False, "error": "missing_fields"}
    try:
        store.delete_profile(device_id, profile_id)
    except ValueError as exc:
        return {"ok": False, "error": str(exc)}
    store.save()
    return {"ok": True}


def _handle_set_active_profile(
    store: DeviceConfigStore, message: dict[str, Any]
) -> dict[str, Any]:
    device_id = message.get("device_id")
    profile_id = message.get("profile_id")
    if not device_id or not profile_id:
        return {"ok": False, "error": "missing_fields"}
    try:
        device = store.set_active_profile(device_id, profile_id)
    except KeyError:
        return {"ok": False, "error": "profile_not_found"}
    store.save()
    return {"ok": True, "device": device}


def _handle_rename_profile(
    store: DeviceConfigStore, message: dict[str, Any]
) -> dict[str, Any]:
    device_id = message.get("device_id")
    profile_id = message.get("profile_id")
    name = message.get("name")
    if not device_id or not profile_id or not name:
        return {"ok": False, "error": "missing_fields"}
    try:
        store.rename_profile(device_id, profile_id, name)
    except KeyError:
        return {"ok": False, "error": "profile_not_found"}
    store.save()
    return {"ok": True}


def _handle_set_profile_plate(
    store: DeviceConfigStore, message: dict[str, Any]
) -> dict[str, Any]:
    device_id = message.get("device_id")
    profile_id = message.get("profile_id")
    plate_id = message.get("plate_id")
    if not device_id or not profile_id or not plate_id:
        return {"ok": False, "error": "missing_fields"}
    try:
        store.set_profile_plate(device_id, profile_id, plate_id)
    except KeyError:
        return {"ok": False, "error": "profile_not_found"}
    store.save()
    return {"ok": True}


def _handle_get_live_state(
    store: DeviceConfigStore, message: dict[str, Any]
) -> dict[str, Any]:
    device_id = message.get("device_id")
    if not device_id:
        return {"ok": False, "error": "missing_device_id"}

    device = store.get_device(device_id) or {"device_id": device_id}
    live_state = get_device_states(device_id).get(device_id, {})
    raw_state = live_state.get("state")
    if not isinstance(raw_state, int):
        raw_state = 0

    controls_by_bit_index, _controls_by_id = build_control_maps(device)
    pressed_bits = [
        bit_index
        for bit_index in sorted(controls_by_bit_index)
        if ((raw_state >> bit_index) & 1) == 1
    ]

    return {
        "ok": True,
        "live_state": {
            "device_id": device_id,
            "connected": device_id in get_connected_devices(),
            "raw_state": raw_state,
            "pressed_bits": pressed_bits,
            "pressed_control_ids": get_pressed_control_ids(device, raw_state),
            "seq": live_state.get("seq"),
            "updated_at": live_state.get("updated_at"),
        },
    }


def _handle_set_last_seen(
    store: DeviceConfigStore, message: dict[str, Any]
) -> dict[str, Any]:
    device_id = message.get("device_id")
    if not device_id:
        return {"ok": False, "error": "missing_device_id"}
    store.set_last_seen(device_id)
    store.save()
    return {"ok": True}


COMMAND_HANDLERS = {
    "ping": _handle_ping,
    "list_devices": _handle_list_devices,
    "get_device": _handle_get_device,
    "get_live_state": _handle_get_live_state,
    "set_descriptor": _handle_set_descriptor,
    "set_device_name": _handle_set_device_name,
    "set_mapping": _handle_set_mapping,
    "set_active_mode": _handle_set_active_mode,
    "set_ui_binding": _handle_set_ui_binding,
    "list_profiles": _handle_list_profiles,
    "create_profile": _handle_create_profile,
    "delete_profile": _handle_delete_profile,
    "set_active_profile": _handle_set_active_profile,
    "rename_profile": _handle_rename_profile,
    "set_profile_plate": _handle_set_profile_plate,
    "set_last_seen": _handle_set_last_seen,
}

RUNTIME_UPDATE_COMMANDS = {
    "set_descriptor",
    "set_mapping",
    "set_active_mode",
    "set_active_profile",
}


def handle_command(
    store: DeviceConfigStore,
    message: dict[str, Any],
) -> tuple[dict[str, Any], bool]:
    command = message.get("cmd")
    if not command:
        return {"ok": False, "error": "missing_cmd"}, False

    handler = COMMAND_HANDLERS.get(command)
    if handler is None:
        return {"ok": False, "error": "unknown_cmd"}, False

    response = handler(store, message)
    should_notify_runtime = (
        command in RUNTIME_UPDATE_COMMANDS and response.get("ok") is True
    )
    return response, should_notify_runtime


def run(
    device_path: str,
    verbose: bool = False,
    config_path: str | None = None,
) -> int:
    store = DeviceConfigStore(path=config_path)
    store.load()

    try:
        fd = os.open(device_path, os.O_RDWR | os.O_NOCTTY)
    except OSError as exc:
        print(f"Failed to open {device_path}: {exc}", file=sys.stderr)
        return 1

    try:
        while True:
            line = read_line(fd)
            if line is None:
                if verbose:
                    print("Serial connection closed")
                break
            if not line:
                continue

            try:
                message = json.loads(line)
            except json.JSONDecodeError:
                if verbose:
                    print("Invalid JSON received")
                write_line(fd, {"ok": False, "error": "invalid_json"})
                continue

            store.load()
            if verbose:
                print(f"Received: {message}")

            response, should_notify_runtime = handle_command(store, message)

            if verbose:
                print(f"Responding: {response}")

            write_line(fd, response)

            if should_notify_runtime:
                runtime_notified = notify_runtime_config_updated()
                if verbose and not runtime_notified:
                    print("Runtime update notification failed")
    except KeyboardInterrupt:
        return 0
    finally:
        os.close(fd)

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="OpenArcade USB serial configuration service"
    )
    parser.add_argument(
        "--device", default="/dev/ttyGS0", help="Serial gadget device path"
    )
    parser.add_argument(
        "--config",
        help="Path to the persistent config store JSON file",
    )
    parser.add_argument("--verbose", action="store_true", help="Enable request logging")
    args = parser.parse_args()
    return run(args.device, args.verbose, args.config)


if __name__ == "__main__":
    raise SystemExit(main())
