from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from typing import Any

import constants as const
from constants import DEFAULT_MAPPING, DEFAULT_GAMEPAD_MAPPING, GAMEPAD_INPUT_MAP
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
    mode: str = "keyboard",
) -> dict[int, int | str]:
    profiles = device_config.get("profiles") or {}
    active_profile_id = device_config.get("active_profile")
    active_profile = profiles.get(active_profile_id) if active_profile_id else None

    # Use the provided mode instead of the device's active_mode
    if active_profile is not None:
        mapping_config = (
            active_profile.get("modes", {}).get(mode, {}).get("mapping", {})
        )
    else:
        mapping_config = (
            device_config.get("modes", {}).get(mode, {}).get("mapping", {})
        )

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
            # Keyboard mode: resolve to keycode
            keycode = resolve_keycode(mapping_entry)
            if keycode is None:
                keycode = DEFAULT_MAPPING.get(bit_index)
            if keycode is not None:
                mapping[bit_index] = keycode
        else:
            # Gamepad mode: resolve to gamepad input name
            gamepad_input = resolve_gamepad_input(mapping_entry)
            if gamepad_input is None:
                gamepad_input = DEFAULT_GAMEPAD_MAPPING.get(bit_index)
            if gamepad_input is not None:
                mapping[bit_index] = gamepad_input

    # Apply defaults for unmapped controls
    if mode == "keyboard":
        for bit_index, keycode in DEFAULT_MAPPING.items():
            mapping.setdefault(bit_index, keycode)
    else:
        for bit_index, gamepad_input in DEFAULT_GAMEPAD_MAPPING.items():
            mapping.setdefault(bit_index, gamepad_input)

    return mapping


def resolve_gamepad_input(entry: Any) -> str | None:
    """Resolve a config entry to a gamepad input name."""
    if entry is None:
        return None
    if isinstance(entry, str):
        # Already a gamepad input name like "xb_button_a"
        if entry in GAMEPAD_INPUT_MAP:
            return entry
        return None
    if isinstance(entry, Mapping):
        gamepad_input = entry.get("gamepad_input") or entry.get("input")
        if isinstance(gamepad_input, str) and gamepad_input in GAMEPAD_INPUT_MAP:
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
    """Build an 8-byte HID keyboard report."""
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


def _resolve_dpad_value(dpad_directions: set[int]) -> int:
    if not dpad_directions:
        return const.GP_DPAD_CENTER

    has_up = const.GP_DPAD_UP in dpad_directions
    has_down = const.GP_DPAD_DOWN in dpad_directions
    has_left = const.GP_DPAD_LEFT in dpad_directions
    has_right = const.GP_DPAD_RIGHT in dpad_directions

    if has_up and not has_down:
        if has_right and not has_left:
            return const.GP_DPAD_UP_RIGHT
        if has_left and not has_right:
            return const.GP_DPAD_UP_LEFT
        return const.GP_DPAD_UP

    if has_down and not has_up:
        if has_right and not has_left:
            return const.GP_DPAD_DOWN_RIGHT
        if has_left and not has_right:
            return const.GP_DPAD_DOWN_LEFT
        return const.GP_DPAD_DOWN

    if has_left and not has_right:
        return const.GP_DPAD_LEFT
    if has_right and not has_left:
        return const.GP_DPAD_RIGHT

    return const.GP_DPAD_CENTER


def _resolve_axis_value(negative_active: bool, positive_active: bool) -> int:
    if negative_active == positive_active:
        return const.GP_AXIS_NEUTRAL
    if negative_active:
        return const.GP_AXIS_MIN
    return const.GP_AXIS_MAX


def build_gamepad_report(active_inputs: Iterable[str]) -> bytes:
    """
    Build an 8-byte HID gamepad report.

    Report structure:
    - Bytes 0-1: Button bitfield (16 buttons)
    - Byte 2: HAT/D-Pad (8-direction + center)
    - Bytes 3-6: Left/Right stick axes
    - Byte 7: Reserved
    """
    report = bytearray(8)

    buttons = 0
    dpad_directions: set[int] = set()
    axis_state: dict[str, set[int]] = {
        const.GP_AXIS_LX: set(),
        const.GP_AXIS_LY: set(),
        const.GP_AXIS_RX: set(),
        const.GP_AXIS_RY: set(),
    }

    for input_name in set(active_inputs):
        if not isinstance(input_name, str):
            continue

        mapping = GAMEPAD_INPUT_MAP.get(input_name)
        if mapping is None:
            continue

        input_type, value = mapping

        if input_type == "button":
            buttons |= (1 << value)
        elif input_type == "dpad":
            dpad_directions.add(value)
        elif input_type == "axis":
            axis_name, direction = value
            if axis_name in axis_state and direction in (
                const.GP_AXIS_NEGATIVE,
                const.GP_AXIS_POSITIVE,
            ):
                axis_state[axis_name].add(direction)

    report[0] = buttons & 0xFF
    report[1] = (buttons >> 8) & 0xFF
    report[2] = _resolve_dpad_value(dpad_directions)
    report[3] = _resolve_axis_value(
        const.GP_AXIS_NEGATIVE in axis_state[const.GP_AXIS_LX],
        const.GP_AXIS_POSITIVE in axis_state[const.GP_AXIS_LX],
    )
    report[4] = _resolve_axis_value(
        const.GP_AXIS_NEGATIVE in axis_state[const.GP_AXIS_LY],
        const.GP_AXIS_POSITIVE in axis_state[const.GP_AXIS_LY],
    )
    report[5] = _resolve_axis_value(
        const.GP_AXIS_NEGATIVE in axis_state[const.GP_AXIS_RX],
        const.GP_AXIS_POSITIVE in axis_state[const.GP_AXIS_RX],
    )
    report[6] = _resolve_axis_value(
        const.GP_AXIS_NEGATIVE in axis_state[const.GP_AXIS_RY],
        const.GP_AXIS_POSITIVE in axis_state[const.GP_AXIS_RY],
    )
    report[7] = 0x00

    return bytes(report)
