from __future__ import annotations

from collections.abc import Mapping
from typing import Literal

from core.constants import DEFAULT_GAMEPAD_MAPPING, DEFAULT_MAPPING

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
        self._device_output_counts: dict[str, dict[int | str, int]] = {}
        self._active_counts: dict[int | str, int] = {}
        self._mode: HIDMode = mode

    def set_mode(self, mode: HIDMode) -> bytes:
        if mode == self._mode:
            return self.build_report()
        self._mode = mode
        self._rebuild_active_outputs()
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
        self._rebuild_active_outputs()
        return self.build_report()

    def update_device_state(self, device_id: str, state: int) -> bytes | None:
        old_state = self._device_states.get(device_id)
        if old_state == state:
            return None
        self._device_states[device_id] = state
        self._update_device_active_outputs(device_id, old_state or 0, state)
        return self.build_report()

    def remove_device_state(self, device_id: str) -> bytes | None:
        if device_id not in self._device_states:
            return None
        self._device_states.pop(device_id, None)
        self._remove_device_active_outputs(device_id)
        return self.build_report()

    def build_report(self) -> bytes:
        if self._mode == "keyboard":
            return self._build_keyboard_report()
        if self._mode == "gamepad_switch_hori":
            return self._build_switch_hori_report()
        return self._build_gamepad_pc_report()

    def _default_mapping(self) -> Mapping[int, int | str]:
        return DEFAULT_MAPPING if self._mode == "keyboard" else DEFAULT_GAMEPAD_MAPPING

    def _device_output_counts_for_state(
        self,
        device_id: str,
        state: int,
    ) -> dict[int | str, int]:
        mapping = self._mapping_cache.get(device_id, self._default_mapping())
        output_counts: dict[int | str, int] = {}
        remaining = state

        while remaining:
            lsb = remaining & -remaining
            bit_index = lsb.bit_length() - 1
            output = mapping.get(bit_index)
            if output is not None:
                output_counts[output] = output_counts.get(output, 0) + 1
            remaining ^= lsb

        return output_counts

    def _decrement_active_output(self, output: int | str) -> None:
        count = self._active_counts.get(output, 0)
        if count <= 1:
            self._active_counts.pop(output, None)
        else:
            self._active_counts[output] = count - 1

    def _update_device_active_outputs(self, device_id: str, old_state: int, new_state: int) -> None:
        mapping = self._mapping_cache.get(device_id, self._default_mapping())
        device_counts = self._device_output_counts.get(device_id, {})
        changed = old_state ^ new_state

        while changed:
            bit = changed & -changed
            bit_index = bit.bit_length() - 1
            output = mapping.get(bit_index)
            if output is not None:
                previous_count = device_counts.get(output, 0)
                if new_state & bit:
                    new_count = previous_count + 1
                    device_counts[output] = new_count
                    if previous_count == 0:
                        self._active_counts[output] = self._active_counts.get(output, 0) + 1
                else:
                    new_count = previous_count - 1
                    if new_count <= 0:
                        device_counts.pop(output, None)
                        if previous_count > 0:
                            self._decrement_active_output(output)
                    else:
                        device_counts[output] = new_count
            changed ^= bit

        if device_counts:
            self._device_output_counts[device_id] = device_counts
        else:
            self._device_output_counts.pop(device_id, None)

    def _remove_device_active_outputs(self, device_id: str) -> None:
        previous_counts = self._device_output_counts.pop(device_id, {})
        for output in previous_counts:
            self._decrement_active_output(output)

    def _rebuild_active_outputs(self) -> None:
        self._device_output_counts = {}
        self._active_counts = {}
        for device_id, state in self._device_states.items():
            counts = self._device_output_counts_for_state(device_id, state)
            if counts:
                self._device_output_counts[device_id] = counts
                for output in counts:
                    self._active_counts[output] = self._active_counts.get(output, 0) + 1

    def _build_keyboard_report(self) -> bytes:
        return build_keyboard_report(self._active_counts.keys())

    def _build_gamepad_pc_report(self) -> bytes:
        return build_gamepad_pc_report(self._active_counts.keys())

    def _build_switch_hori_report(self) -> bytes:
        return build_gamepad_switch_hori_report(self._active_counts.keys())
