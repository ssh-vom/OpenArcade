from __future__ import annotations

from collections.abc import Mapping
from typing import Literal

from constants import DEFAULT_GAMEPAD_MAPPING, DEFAULT_MAPPING

from .report_builder import (
    build_gamepad_pc_report,
    build_gamepad_switch_hori_report,
    build_keyboard_report,
)


HIDMode = Literal["keyboard", "gamepad_pc", "gamepad_switch_hori"]


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
        self._mode = mode
        return self.build_report()

    def get_mode(self) -> HIDMode:
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
        if self._mode == "keyboard":
            return self._build_keyboard_report()
        if self._mode == "gamepad_switch_hori":
            return self._build_switch_hori_report()
        return self._build_gamepad_pc_report()

    def _build_keyboard_report(self) -> bytes:
        active_keys: set[int] = set()
        for device_id, state in self._device_states.items():
            mapping = self._mapping_cache.get(device_id, DEFAULT_MAPPING)
            for bit_index, key_code in mapping.items():
                if (state >> bit_index) & 1 and isinstance(key_code, int):
                    active_keys.add(key_code)
        return build_keyboard_report(active_keys)

    def _collect_active_inputs(self) -> set[str]:
        active_inputs: set[str] = set()
        for device_id, state in self._device_states.items():
            mapping = self._mapping_cache.get(device_id, DEFAULT_GAMEPAD_MAPPING)
            for bit_index, gamepad_input in mapping.items():
                if (state >> bit_index) & 1 and isinstance(gamepad_input, str):
                    active_inputs.add(gamepad_input)
        return active_inputs

    def _build_gamepad_pc_report(self) -> bytes:
        return build_gamepad_pc_report(self._collect_active_inputs())

    def _build_switch_hori_report(self) -> bytes:
        return build_gamepad_switch_hori_report(self._collect_active_inputs())
