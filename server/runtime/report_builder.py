from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from typing import Any

import constants as const
from constants import (
    DEFAULT_GAMEPAD_MAPPING,
    DEFAULT_MAPPING,
    GAMEPAD_INPUT_MAP,
    SWITCH_HORI_INPUT_MAP,
)
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
GAMEPAD_MODE_ALIASES = {
    "gamepad": "gamepad_pc",
    "gamepad_pc": "gamepad_pc",
    "gamepad_switch_hori": "gamepad_switch_hori",
}


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


def _normalize_mapping_mode(mode: str) -> str:
    if mode == "keyboard":
        return "keyboard"
    return GAMEPAD_MODE_ALIASES.get(mode, mode)


def _resolve_mapping_config(
    device_config: Mapping[str, Any],
    mode: str,
) -> Mapping[str, Any]:
    normalized_mode = _normalize_mapping_mode(mode)
    profiles = device_config.get("profiles") or {}
    active_profile_id = device_config.get("active_profile")
    active_profile = profiles.get(active_profile_id) if active_profile_id else None

    mode_candidates = [normalized_mode]
    if normalized_mode != "gamepad":
        mode_candidates.append("gamepad")

    def _pick_mapping(modes: Mapping[str, Any]) -> Mapping[str, Any]:
        fallback_mapping: Mapping[str, Any] | None = None
        for candidate in mode_candidates:
            mode_entry = modes.get(candidate)
            if not isinstance(mode_entry, Mapping):
                continue
            mapping_config = mode_entry.get("mapping", {})
            if not isinstance(mapping_config, Mapping):
                continue
            if mapping_config:
                return mapping_config
            if fallback_mapping is None:
                fallback_mapping = mapping_config
        return fallback_mapping or {}

    if active_profile is not None:
        profile_modes = active_profile.get("modes", {})
        if isinstance(profile_modes, Mapping):
            return _pick_mapping(profile_modes)
    else:
        device_modes = device_config.get("modes", {})
        if isinstance(device_modes, Mapping):
            return _pick_mapping(device_modes)

    return {}


def build_mapping(
    device_config: Mapping[str, Any],
    default_controls: Sequence[Mapping[str, Any]] | None = None,
    mode: str = "keyboard",
) -> dict[int, int | str]:
    mapping_config = _resolve_mapping_config(device_config, mode)
    controls = get_device_controls(device_config, default_controls)

    mapping: dict[int, int | str] = {}
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

        if mode == "keyboard":
            keycode = resolve_keycode(mapping_entry)
            if keycode is None:
                keycode = DEFAULT_MAPPING.get(bit_index)
            if keycode is not None:
                mapping[bit_index] = keycode
        else:
            gamepad_input = resolve_gamepad_input(mapping_entry)
            if gamepad_input is None:
                gamepad_input = DEFAULT_GAMEPAD_MAPPING.get(bit_index)
            if gamepad_input is not None:
                mapping[bit_index] = gamepad_input

    if mode == "keyboard":
        for bit_index, keycode in DEFAULT_MAPPING.items():
            mapping.setdefault(bit_index, keycode)
    else:
        for bit_index, gamepad_input in DEFAULT_GAMEPAD_MAPPING.items():
            mapping.setdefault(bit_index, gamepad_input)

    return mapping


def resolve_gamepad_input(entry: Any) -> str | None:
    if entry is None:
        return None
    if isinstance(entry, str):
        if entry in GAMEPAD_INPUT_MAP or entry in SWITCH_HORI_INPUT_MAP:
            return entry
        return None
    if isinstance(entry, Mapping):
        gamepad_input = entry.get("gamepad_input") or entry.get("input")
        if isinstance(gamepad_input, str) and (
            gamepad_input in GAMEPAD_INPUT_MAP or gamepad_input in SWITCH_HORI_INPUT_MAP
        ):
            return gamepad_input
    return None


def build_mapping_cache(
    config_snapshot: Mapping[str, Any],
    default_controls: Sequence[Mapping[str, Any]] | None = None,
    mode: str = "keyboard",
) -> dict[str, dict[int, int | str]]:
    controls = default_controls or DEFAULT_CONTROLS
    devices = config_snapshot.get("devices", {})
    if not isinstance(devices, Mapping):
        return {}

    return {
        device_id: build_mapping(device_config, controls, mode)
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


def _apply_axis_inputs(
    active_inputs: set[str],
    input_map: Mapping[str, tuple[str, Any]],
    neutral: int,
    minimum: int,
    maximum: int,
) -> dict[str, int]:
    axes = {
        "lx": neutral,
        "ly": neutral,
        "rx": neutral,
        "ry": neutral,
    }
    directions: dict[str, set[int]] = {axis: set() for axis in axes}

    for input_name in active_inputs:
        mapping = input_map.get(input_name)
        if mapping is None:
            continue
        input_type, value = mapping
        if input_type != "axis":
            continue
        axis_name, direction = value
        if axis_name in directions and direction in (-1, 1):
            directions[axis_name].add(direction)

    for axis_name, axis_directions in directions.items():
        if -1 in axis_directions and 1 in axis_directions:
            axes[axis_name] = neutral
        elif -1 in axis_directions:
            axes[axis_name] = minimum
        elif 1 in axis_directions:
            axes[axis_name] = maximum

    return axes


def _resolve_hat_value(
    directions: set[int],
    up: int,
    right: int,
    down: int,
    left: int,
    up_right: int,
    down_right: int,
    down_left: int,
    up_left: int,
    centered: int,
) -> int:
    if not directions:
        return centered

    has_up = up in directions
    has_down = down in directions
    has_left = left in directions
    has_right = right in directions

    if has_up and has_right:
        return up_right
    if has_down and has_right:
        return down_right
    if has_down and has_left:
        return down_left
    if has_up and has_left:
        return up_left
    if has_up:
        return up
    if has_down:
        return down
    if has_left:
        return left
    if has_right:
        return right
    return centered


def build_gamepad_pc_report(active_inputs: Iterable[str]) -> bytes:
    report = bytearray(8)
    normalized_inputs = {input_name for input_name in active_inputs if isinstance(input_name, str)}

    buttons = 0
    dpad_directions: set[int] = set()
    axes = _apply_axis_inputs(
        normalized_inputs,
        GAMEPAD_INPUT_MAP,
        neutral=const.GP_AXIS_NEUTRAL,
        minimum=const.GP_AXIS_MIN,
        maximum=const.GP_AXIS_MAX,
    )

    for input_name in normalized_inputs:
        mapping = GAMEPAD_INPUT_MAP.get(input_name)
        if mapping is None:
            continue
        input_type, value = mapping
        if input_type == "button":
            buttons |= 1 << value
        elif input_type == "dpad":
            dpad_directions.add(value)

    dpad_value = _resolve_hat_value(
        dpad_directions,
        up=const.GP_DPAD_UP,
        right=const.GP_DPAD_RIGHT,
        down=const.GP_DPAD_DOWN,
        left=const.GP_DPAD_LEFT,
        up_right=const.GP_DPAD_UP_RIGHT,
        down_right=const.GP_DPAD_DOWN_RIGHT,
        down_left=const.GP_DPAD_DOWN_LEFT,
        up_left=const.GP_DPAD_UP_LEFT,
        centered=const.GP_DPAD_CENTER,
    )

    report[0] = buttons & 0xFF
    report[1] = (buttons >> 8) & 0xFF
    report[2] = dpad_value
    report[3] = axes["lx"]
    report[4] = axes["ly"]
    report[5] = axes["rx"]
    report[6] = axes["ry"]
    report[7] = 0x00
    return bytes(report)


def build_gamepad_switch_hori_report(active_inputs: Iterable[str]) -> bytes:
    report = bytearray(8)
    normalized_inputs = {input_name for input_name in active_inputs if isinstance(input_name, str)}

    buttons = 0
    dpad_directions: set[int] = set()
    axes = _apply_axis_inputs(
        normalized_inputs,
        SWITCH_HORI_INPUT_MAP,
        neutral=const.SW_HORI_AXIS_NEUTRAL,
        minimum=const.SW_HORI_AXIS_MIN,
        maximum=const.SW_HORI_AXIS_MAX,
    )

    for input_name in normalized_inputs:
        mapping = SWITCH_HORI_INPUT_MAP.get(input_name)
        if mapping is None:
            continue
        input_type, value = mapping
        if input_type == "button":
            buttons |= 1 << value
        elif input_type == "dpad":
            dpad_directions.add(value)

    dpad_value = _resolve_hat_value(
        dpad_directions,
        up=const.SW_HORI_HAT_UP,
        right=const.SW_HORI_HAT_RIGHT,
        down=const.SW_HORI_HAT_DOWN,
        left=const.SW_HORI_HAT_LEFT,
        up_right=const.SW_HORI_HAT_UP_RIGHT,
        down_right=const.SW_HORI_HAT_DOWN_RIGHT,
        down_left=const.SW_HORI_HAT_DOWN_LEFT,
        up_left=const.SW_HORI_HAT_UP_LEFT,
        centered=const.SW_HORI_HAT_CENTER,
    )

    report[0] = buttons & 0xFF
    report[1] = (buttons >> 8) & 0xFF
    report[2] = dpad_value
    report[3] = axes["lx"]
    report[4] = axes["ly"]
    report[5] = axes["rx"]
    report[6] = axes["ry"]
    report[7] = const.SW_HORI_VENDOR_BYTE_DEFAULT
    return bytes(report)


def build_gamepad_report(active_inputs: Iterable[str]) -> bytes:
    """Backward-compatible alias for the PC gamepad report builder."""
    return build_gamepad_pc_report(active_inputs)
