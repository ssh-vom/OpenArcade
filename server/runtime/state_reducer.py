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
        self._device_active_outputs: dict[str, set[int | str]] = {}
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
        if self._device_states.get(device_id) == state:
            return None
        self._device_states[device_id] = state
        self._update_device_active_outputs(device_id)
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

    def _outputs_for_device_state(self, device_id: str, state: int) -> set[int | str]:
        outputs: set[int | str] = set()
        default_mapping: Mapping[int, int | str]
        if self._mode == "keyboard":
            default_mapping = DEFAULT_MAPPING
        else:
            default_mapping = DEFAULT_GAMEPAD_MAPPING

        mapping = self._mapping_cache.get(device_id, default_mapping)
        for bit_index, output in mapping.items():
            if (state >> bit_index) & 1:
                if self._mode == "keyboard" and isinstance(output, int):
                    outputs.add(output)
                elif self._mode != "keyboard" and isinstance(output, str):
                    outputs.add(output)
        return outputs

    def _apply_output_delta(
        self,
        previous_outputs: set[int | str],
        new_outputs: set[int | str],
    ) -> None:
        for output in previous_outputs - new_outputs:
            count = self._active_counts.get(output, 0)
            if count <= 1:
                self._active_counts.pop(output, None)
            else:
                self._active_counts[output] = count - 1

        for output in new_outputs - previous_outputs:
            self._active_counts[output] = self._active_counts.get(output, 0) + 1

    def _update_device_active_outputs(self, device_id: str) -> None:
        state = self._device_states.get(device_id, 0)
        previous_outputs = self._device_active_outputs.get(device_id, set())
        new_outputs = self._outputs_for_device_state(device_id, state)
        self._apply_output_delta(previous_outputs, new_outputs)
        if new_outputs:
            self._device_active_outputs[device_id] = new_outputs
        else:
            self._device_active_outputs.pop(device_id, None)

    def _remove_device_active_outputs(self, device_id: str) -> None:
        previous_outputs = self._device_active_outputs.pop(device_id, set())
        self._apply_output_delta(previous_outputs, set())

    def _rebuild_active_outputs(self) -> None:
        self._device_active_outputs = {}
        self._active_counts = {}
        for device_id, state in self._device_states.items():
            outputs = self._outputs_for_device_state(device_id, state)
            if outputs:
                self._device_active_outputs[device_id] = outputs
                for output in outputs:
                    self._active_counts[output] = self._active_counts.get(output, 0) + 1

    def _build_keyboard_report(self) -> bytes:
        active_keys = {
            output for output in self._active_counts if isinstance(output, int)
        }
        return build_keyboard_report(active_keys)

    def _collect_active_inputs(self) -> set[str]:
        return {
            output for output in self._active_counts if isinstance(output, str)
        }

    def _build_gamepad_pc_report(self) -> bytes:
        return build_gamepad_pc_report(self._collect_active_inputs())

    def _build_switch_hori_report(self) -> bytes:
        return build_gamepad_switch_hori_report(self._collect_active_inputs())
