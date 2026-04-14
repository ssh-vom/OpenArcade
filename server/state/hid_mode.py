"""
HID Mode State Manager

Manages the global HID mode state selected via GPIO on the Raspberry Pi.
This is the source of truth for which HID output mode is currently active
across the entire system.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any, Literal, cast

from core.state import StateManager


logger = logging.getLogger("OpenArcade")

HIDMode = Literal["keyboard", "gamepad_pc", "gamepad_switch_hori"]
VALID_HID_MODES: tuple[HIDMode, ...] = (
    "keyboard",
    "gamepad_pc",
    "gamepad_switch_hori",
)
LEGACY_HID_MODE_ALIASES: dict[str, HIDMode] = {
    "gamepad": "gamepad_pc",
}

OPENARCADE_HID_MODE_PATH_ENV_VAR = "OPENARCADE_HID_MODE_PATH"
DEFAULT_HID_MODE_PATH = "/var/lib/openarcade/hid_mode.json"


def resolve_hid_mode_path() -> str:
    """Get the HID mode state file path from environment or use default."""
    return os.environ.get(
        OPENARCADE_HID_MODE_PATH_ENV_VAR,
        DEFAULT_HID_MODE_PATH,
    )


class HIDModeState(StateManager):
    """
    Manages persistent HID mode state across the system.
    
    The state includes:
    - active_mode: "keyboard", "gamepad_pc", or "gamepad_switch_hori"
    - source: where the mode change originated (e.g., "gpio", "api")
    - sequence: incrementing counter for change tracking
    - updated_at: ISO timestamp of last change
    """

    def __init__(self, path: str | None = None) -> None:
        super().__init__(path or resolve_hid_mode_path())

    def _default_state(self) -> dict[str, Any]:
        return {
            "active_mode": "keyboard",
            "source": "default",
            "sequence": 0,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    def _normalize_state(self, state: Any) -> dict[str, Any]:
        if not isinstance(state, dict):
            return self._default_state()

        normalized = dict(state)
        active_mode = normalized.get("active_mode")
        normalized_mode = LEGACY_HID_MODE_ALIASES.get(str(active_mode), active_mode)
        if normalized_mode not in VALID_HID_MODES:
            normalized["active_mode"] = "keyboard"
        elif normalized_mode != active_mode:
            normalized["active_mode"] = normalized_mode
        if "source" not in normalized:
            normalized["source"] = "unknown"
        if not isinstance(normalized.get("sequence"), int):
            normalized["sequence"] = 0
        if "updated_at" not in normalized:
            normalized["updated_at"] = datetime.now(timezone.utc).isoformat()
        return normalized

    def _log_level(self) -> int:
        return logging.WARNING

    def _validate_mode(self, mode: str) -> HIDMode:
        """Validate and normalize mode value."""
        normalized_mode = LEGACY_HID_MODE_ALIASES.get(mode, mode)
        if normalized_mode not in VALID_HID_MODES:
            raise ValueError(
                f"Invalid HID mode: {mode}. Must be one of: {', '.join(VALID_HID_MODES)}"
            )
        return cast(HIDMode, normalized_mode)

    def save_mode(
        self,
        mode: HIDMode,
        source: str = "api",
    ) -> dict[str, Any]:
        """
        Save new HID mode state.
        
        Args:
            mode: The HID mode to activate
            source: Source of the mode change (e.g., "gpio", "api")
        
        Returns:
            The new state dictionary
        """
        validated_mode = self._validate_mode(mode)
        current = self.load(use_cache=False)
        new_state = {
            "active_mode": validated_mode,
            "source": source,
            "sequence": current.get("sequence", 0) + 1,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        return self.save(new_state)

    def get_active_mode(self, use_cache: bool = False) -> HIDMode:
        """
        Get just the active mode string.
        
        Args:
            use_cache: If True, use cached value without reading file
        
        Returns:
            "keyboard", "gamepad_pc", or "gamepad_switch_hori"
        """
        state = self.load(use_cache=use_cache)
        return state["active_mode"]  # type: ignore

    def cycle_mode(self, source: str = "gpio") -> dict[str, Any]:
        """
        Cycle through the supported HID modes.
        
        Args:
            source: Source of the mode change (e.g., "gpio", "api")
        
        Returns:
            The new state dictionary
        """
        current_mode = self.get_active_mode()
        mode_cycle: tuple[HIDMode, ...] = VALID_HID_MODES
        current_index = mode_cycle.index(current_mode)
        new_mode = mode_cycle[(current_index + 1) % len(mode_cycle)]
        return self.save_mode(new_mode, source=source)
