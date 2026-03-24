from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from typing import Any

import constants as const
from constants import DEFAULT_MAPPING
from default_descriptor import default_descriptor


KEYCODES = {
    name: value for name, value in vars(const).items() if name.startswith("HID_KEY_")
}

MODIFIER_KEYCODES = {
    const.HID_KEY_LEFT_CONTROL: 0x01,
    const.HID_KEY_LEFT_SHIFT: 0x02,
    const.HID_KEY_LEFT_ALT: 0x04,
    const.HID_KEY_LEFT_GUI: 0x08,
    const.HID_KEY_RIGHT_CONTROL: 0x10,
    const.HID_KEY_RIGHT_SHIFT: 0x20,
    const.HID_KEY_RIGHT_ALT: 0x40,
    const.HID_KEY_RIGHT_GUI: 0x80,
}

DEFAULT_CONTROLS = [control.to_dict() for control in default_descriptor().controls]


def get_device_controls(
    device_config: Mapping[str, Any],
    default_controls: Sequence[Mapping[str, Any]] | None = None,
) -> list[Mapping[str, Any]]:
    descriptor = device_config.get("descriptor") or {}
    controls = descriptor.get("controls") or (default_controls or DEFAULT_CONTROLS)
    return [control for control in controls if isinstance(control, Mapping)]


def build_control_maps(
    device_config: Mapping[str, Any],
    default_controls: Sequence[Mapping[str, Any]] | None = None,
) -> tuple[dict[int, Mapping[str, Any]], dict[str, Mapping[str, Any]]]:
    controls_by_bit_index: dict[int, Mapping[str, Any]] = {}
    controls_by_id: dict[str, Mapping[str, Any]] = {}

    for control in get_device_controls(device_config, default_controls):
        bit_index = control.get("bit_index")
        if isinstance(bit_index, int):
            controls_by_bit_index[bit_index] = control

        control_id = control.get("id")
        if control_id is not None:
            controls_by_id[str(control_id)] = control

    return controls_by_bit_index, controls_by_id


def get_pressed_control_ids(
    device_config: Mapping[str, Any],
    state: int,
    default_controls: Sequence[Mapping[str, Any]] | None = None,
) -> list[str]:
    controls_by_bit_index, _controls_by_id = build_control_maps(
        device_config,
        default_controls,
    )
    pressed_control_ids: list[str] = []

    for bit_index in sorted(controls_by_bit_index):
        if ((state >> bit_index) & 1) == 0:
            continue

        control_id = controls_by_bit_index[bit_index].get("id")
        if control_id is not None:
            pressed_control_ids.append(str(control_id))

    return pressed_control_ids


def resolve_keycode(entry: Any) -> int | None:
    if entry is None:
        return None
    if isinstance(entry, int):
        return entry
    if isinstance(entry, Mapping):
        entry = entry.get("keycode")
    if isinstance(entry, str):
        if entry in KEYCODES:
            return KEYCODES[entry]
        if entry.startswith("0x"):
            try:
                return int(entry, 16)
            except ValueError:
                return None
        if entry.isdigit():
            return int(entry)
    return None


def build_mapping(
    device_config: Mapping[str, Any],
    default_controls: Sequence[Mapping[str, Any]] | None = None,
) -> dict[int, int]:
    profiles = device_config.get("profiles") or {}
    active_profile_id = device_config.get("active_profile")
    active_profile = profiles.get(active_profile_id) if active_profile_id else None

    if active_profile is not None:
        active_mode = active_profile.get("active_mode") or "keyboard"
        mapping_config = (
            active_profile.get("modes", {}).get(active_mode, {}).get("mapping", {})
        )
    else:
        active_mode = device_config.get("active_mode") or "keyboard"
        mapping_config = (
            device_config.get("modes", {}).get(active_mode, {}).get("mapping", {})
        )

    controls = get_device_controls(device_config, default_controls)

    mapping: dict[int, int] = {}
    for control in controls:
        bit_index = control.get("bit_index")
        if not isinstance(bit_index, int):
            continue

        control_id = control.get("id")
        mapping_entry = None
        if control_id is not None:
            mapping_entry = mapping_config.get(
                str(control_id), mapping_config.get(control_id)
            )

        keycode = resolve_keycode(mapping_entry)
        if keycode is None:
            keycode = DEFAULT_MAPPING.get(bit_index)
        if keycode is not None:
            mapping[bit_index] = keycode

    for bit_index, keycode in DEFAULT_MAPPING.items():
        mapping.setdefault(bit_index, keycode)

    return mapping


def build_mapping_cache(
    config_snapshot: Mapping[str, Any],
    default_controls: Sequence[Mapping[str, Any]] | None = None,
) -> dict[str, dict[int, int]]:
    controls = default_controls or DEFAULT_CONTROLS
    devices = config_snapshot.get("devices", {})
    if not isinstance(devices, Mapping):
        return {}

    return {
        device_id: build_mapping(device_config, controls)
        for device_id, device_config in devices.items()
        if isinstance(device_id, str) and isinstance(device_config, Mapping)
    }


def build_keyboard_report(active_keys: Iterable[int]) -> bytes:
    report = bytearray(8)
    modifiers = 0
    non_modifier_keys: list[int] = []

    for key_code in set(active_keys):
        modifier_bit = MODIFIER_KEYCODES.get(key_code)
        if modifier_bit is not None:
            modifiers |= modifier_bit
        else:
            non_modifier_keys.append(key_code)

    report[0] = modifiers

    for index, key_code in enumerate(sorted(non_modifier_keys)[:6]):
        report[2 + index] = key_code

    return bytes(report)
