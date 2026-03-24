from __future__ import annotations

from collections.abc import Mapping

from constants import DEFAULT_MAPPING

from .report_builder import build_keyboard_report


class StateReducer:
    def __init__(
        self, mapping_cache: Mapping[str, Mapping[int, int]] | None = None
    ) -> None:
        self._mapping_cache = {
            device_id: dict(device_mapping)
            for device_id, device_mapping in (mapping_cache or {}).items()
        }
        self._device_states: dict[str, int] = {}

    def set_mapping_cache(
        self, mapping_cache: Mapping[str, Mapping[int, int]]
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
        active_keys: set[int] = set()
        for device_id, state in self._device_states.items():
            mapping = self._mapping_cache.get(device_id, DEFAULT_MAPPING)
            for bit_index, key_code in mapping.items():
                if (state >> bit_index) & 1:
                    active_keys.add(key_code)
        return build_keyboard_report(active_keys)
