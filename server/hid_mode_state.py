"""
HID Mode State Manager

Manages the global HID mode state (keyboard vs gamepad) that is selected
via GPIO on the Raspberry Pi. This is the source of truth for which HID
output mode is currently active across the entire system.
"""

from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone
from typing import Any, Literal


HIDMode = Literal["keyboard", "gamepad"]

OPENARCADE_HID_MODE_PATH_ENV_VAR = "OPENARCADE_HID_MODE_PATH"
DEFAULT_HID_MODE_PATH = "/var/lib/openarcade/hid_mode.json"


def resolve_hid_mode_path() -> str:
    """Get the HID mode state file path from environment or use default."""
    return os.environ.get(
        OPENARCADE_HID_MODE_PATH_ENV_VAR,
        DEFAULT_HID_MODE_PATH,
    )


class HIDModeState:
    """
    Manages persistent HID mode state across the system.
    
    The state includes:
    - active_mode: "keyboard" or "gamepad"
    - source: where the mode change originated (e.g., "gpio", "api")
    - sequence: incrementing counter for change tracking
    - updated_at: ISO timestamp of last change
    """

    def __init__(self, path: str | None = None) -> None:
        self.path = path or resolve_hid_mode_path()
        self._lock = threading.RLock()
        self._cache: dict[str, Any] | None = None

    def _default_state(self) -> dict[str, Any]:
        """Create default state when file doesn't exist."""
        return {
            "active_mode": "keyboard",
            "source": "default",
            "sequence": 0,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    def _validate_mode(self, mode: str) -> HIDMode:
        """Validate and normalize mode value."""
        if mode not in ("keyboard", "gamepad"):
            raise ValueError(f"Invalid HID mode: {mode}. Must be 'keyboard' or 'gamepad'")
        return mode  # type: ignore

    def _write_state_unlocked(self, state: dict[str, Any]) -> None:
        """Write state atomically. Caller must hold self._lock."""
        directory = os.path.dirname(self.path)
        if directory:
            os.makedirs(directory, exist_ok=True)

        tmp_path = f"{self.path}.tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
            f.write("\n")

        os.replace(tmp_path, self.path)

    def load(self, use_cache: bool = False) -> dict[str, Any]:
        """
        Load current HID mode state.
        
        Args:
            use_cache: If True, return cached value without reading file
        
        Returns:
            Dictionary with active_mode, source, sequence, updated_at
        """
        with self._lock:
            if use_cache and self._cache is not None:
                return dict(self._cache)

            if not os.path.exists(self.path):
                state = self._default_state()
                self._write_state_unlocked(state)
                self._cache = state
                return dict(state)

            try:
                with open(self.path, "r", encoding="utf-8") as f:
                    state = json.load(f)

                if not isinstance(state, dict):
                    state = self._default_state()
                else:
                    # Validate and normalize
                    state.setdefault("active_mode", "keyboard")
                    state.setdefault("source", "unknown")
                    state.setdefault("sequence", 0)
                    state.setdefault("updated_at", datetime.now(timezone.utc).isoformat())

                    # Validate mode value
                    try:
                        state["active_mode"] = self._validate_mode(state["active_mode"])
                    except ValueError:
                        state["active_mode"] = "keyboard"

                # Rewrite normalized/default state so the file always exists and is valid
                self._write_state_unlocked(state)
                self._cache = state
                return dict(state)

            except (OSError, json.JSONDecodeError):
                state = self._default_state()
                self._write_state_unlocked(state)
                self._cache = state
                return dict(state)

    def save(
        self,
        mode: HIDMode,
        source: str = "api",
    ) -> dict[str, Any]:
        """
        Save new HID mode state.
        
        Args:
            mode: The HID mode to activate ("keyboard" or "gamepad")
            source: Source of the mode change (e.g., "gpio", "api")
        
        Returns:
            The new state dictionary
        """
        with self._lock:
            validated_mode = self._validate_mode(mode)

            # Load current state to get sequence number
            current = self.load(use_cache=True)

            # Build new state
            new_state = {
                "active_mode": validated_mode,
                "source": source,
                "sequence": current.get("sequence", 0) + 1,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            self._write_state_unlocked(new_state)

            # Update cache
            self._cache = new_state
            return dict(new_state)

    def get_active_mode(self, use_cache: bool = False) -> HIDMode:
        """
        Get just the active mode string.
        
        Args:
            use_cache: If True, use cached value without reading file
        
        Returns:
            "keyboard" or "gamepad"
        """
        state = self.load(use_cache=use_cache)
        return state["active_mode"]  # type: ignore

    def get_sequence(self, use_cache: bool = False) -> int:
        """
        Get the current sequence number for change detection.
        
        Args:
            use_cache: If True, use cached value without reading file
        
        Returns:
            Sequence number (increments on each mode change)
        """
        state = self.load(use_cache=use_cache)
        return state.get("sequence", 0)

    def toggle_mode(self, source: str = "gpio") -> dict[str, Any]:
        """
        Toggle between keyboard and gamepad mode.
        
        Args:
            source: Source of the toggle (e.g., "gpio", "api")
        
        Returns:
            The new state dictionary
        """
        current_mode = self.get_active_mode()
        new_mode: HIDMode = "gamepad" if current_mode == "keyboard" else "keyboard"
        return self.save(new_mode, source=source)
