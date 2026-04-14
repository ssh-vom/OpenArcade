from __future__ import annotations

from typing import Any

from config.store import DeviceConfigStore
from core.ipc import get_connected_devices, get_device_states
from runtime.report_builder import build_control_maps, get_pressed_control_ids


def _normalize_device_id(device_id: Any) -> str:
    if not isinstance(device_id, str):
        return ""
    return "".join(ch for ch in device_id.strip().upper() if ch.isalnum())


def _build_connected_lookup(live_connected_devices: set[str]) -> set[str]:
    connected_lookup: set[str] = set()
    for live_device_id in live_connected_devices:
        normalized = _normalize_device_id(live_device_id)
        if normalized:
            connected_lookup.add(normalized)
    return connected_lookup


def _persist_missing_live_devices(
    store: DeviceConfigStore,
    live_connected_devices: set[str],
) -> None:
    data = store.get_all()
    devices = data.get("devices", {})
    if not isinstance(devices, dict):
        devices = {}

    known_ids: set[str] = set()
    for device_id in devices:
        normalized = _normalize_device_id(device_id)
        if normalized:
            known_ids.add(normalized)

    added_new_device = False
    for live_device_id in sorted(live_connected_devices):
        normalized = _normalize_device_id(live_device_id)
        if not normalized or normalized in known_ids:
            continue

        store.upsert_device(live_device_id)
        known_ids.add(normalized)
        added_new_device = True

    if added_new_device:
        store.save()


def _handle_ping(_store: DeviceConfigStore, _message: dict[str, Any]) -> dict[str, Any]:
    return {"ok": True, "reply": "pong"}


def _handle_list_devices(
    store: DeviceConfigStore, _message: dict[str, Any]
) -> dict[str, Any]:
    live_connected_devices = {
        device_id
        for device_id in get_connected_devices()
        if isinstance(device_id, str) and device_id.strip()
    }
    _persist_missing_live_devices(store, live_connected_devices)

    data = store.get_all()
    devices = data.get("devices", {})
    connected_lookup = _build_connected_lookup(live_connected_devices)
    if isinstance(devices, dict):
        for device_id, device in devices.items():
            if isinstance(device, dict):
                device["connected"] = (
                    _normalize_device_id(device_id) in connected_lookup
                )
    return {"ok": True, "devices": devices}


def _handle_get_device(
    store: DeviceConfigStore, message: dict[str, Any]
) -> dict[str, Any]:
    device_id = message.get("device_id")
    if not device_id:
        return {"ok": False, "error": "missing_device_id"}

    device = store.get_device(device_id)
    connected_lookup = _build_connected_lookup(get_connected_devices())
    if isinstance(device, dict):
        device["connected"] = _normalize_device_id(device_id) in connected_lookup
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
    strategy = message.get("strategy") or "override"
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

    connected_lookup = _build_connected_lookup(get_connected_devices())

    return {
        "ok": True,
        "live_state": {
            "device_id": device_id,
            "connected": _normalize_device_id(device_id) in connected_lookup,
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
