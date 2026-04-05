from __future__ import annotations

from collections.abc import Mapping
from typing import Literal

from constants import DEFAULT_MAPPING, DEFAULT_GAMEPAD_MAPPING

from .report_builder import build_keyboard_report, build_gamepad_report


HIDMode = Literal["keyboard", "gamepad"]


class StateReducer:
    """Aggregates device states and builds HID reports for the active mode."""

    def __init__(
        self,
        mapping_cache: Mapping[str, Mapping[int, int | str]] | None = None,
        mode: HIDMode = "keyboard",
    ) -> None:
        self._mapping_cache = {
            device_id: dict(device_mapping)
            for device_id, device_mapping in (mapping_cache or {}).items()
        }
        self._device_states: dict[str, int] = {}
        self._mode: HIDMode = mode

    def set_mode(self, mode: HIDMode) -> bytes:
        """Switch HID output mode and rebuild report."""
        self._mode = mode
        return self.build_report()

    def get_mode(self) -> HIDMode:
        """Get current HID mode."""
        return self._mode

    def set_mapping_cache(
        self, mapping_cache: Mapping[str, Mapping[int, int | str]]
    ) -> bytes:
        self._mapping_cache = {
            device_id: dict(device_mapping)
            for device_id, device_mapping in mapping_cache.items()
        }
        return self.build_report()

    def update_device_state(self, device_id: str, state: int) -> bytes | None:
        if self._device_states.get(device_id) == state:
            return None
        self._device_states[device_id] = state
        return self.build_report()

    def remove_device_state(self, device_id: str) -> bytes | None:
        if device_id not in self._device_states:
            return None
        self._device_states.pop(device_id, None)
        return self.build_report()

    def build_report(self) -> bytes:
        """Build HID report for the current mode."""
        if self._mode == "keyboard":
            return self._build_keyboard_report()
        else:
            return self._build_gamepad_report()

    def _build_keyboard_report(self) -> bytes:
        """Build keyboard HID report from current device states."""
        active_keys: set[int] = set()
        for device_id, state in self._device_states.items():
            mapping = self._mapping_cache.get(device_id, DEFAULT_MAPPING)
            for bit_index, key_code in mapping.items():
                if (state >> bit_index) & 1:
                    if isinstance(key_code, int):
                        active_keys.add(key_code)
        return build_keyboard_report(active_keys)

    def _build_gamepad_report(self) -> bytes:
        """Build gamepad HID report from current device states."""
        active_inputs: set[str] = set()
        for device_id, state in self._device_states.items():
            mapping = self._mapping_cache.get(device_id, DEFAULT_GAMEPAD_MAPPING)
            for bit_index, gamepad_input in mapping.items():
                if (state >> bit_index) & 1:
                    if isinstance(gamepad_input, str):
                        active_inputs.add(gamepad_input)
        return build_gamepad_report(active_inputs)
