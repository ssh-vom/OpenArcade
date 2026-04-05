"""
HID Mode State Manager

Manages the global HID mode state selected via GPIO on the Raspberry Pi.
This is the source of truth for which HID output mode is currently active
across the entire system.
"""

from __future__ import annotations

import json
import logging
import os
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from multiprocessing import current_process
from typing import Any, Iterator, Literal, cast

import fcntl


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


class HIDModeState:
    """
    Manages persistent HID mode state across the system.
    
    The state includes:
    - active_mode: "keyboard", "gamepad_pc", or "gamepad_switch_hori"
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
        normalized_mode = LEGACY_HID_MODE_ALIASES.get(mode, mode)
        if normalized_mode not in VALID_HID_MODES:
            raise ValueError(
                "Invalid HID mode: "
                f"{mode}. Must be one of: {', '.join(VALID_HID_MODES)}"
            )
        return cast(HIDMode, normalized_mode)

    @property
    def _lock_path(self) -> str:
        return f"{self.path}.lock"

    @contextmanager
    def _file_lock(self) -> Iterator[None]:
        """Cross-process file lock for HID mode state mutations."""
        directory = os.path.dirname(self._lock_path)
        if directory:
            os.makedirs(directory, exist_ok=True)

        with open(self._lock_path, "a+", encoding="utf-8") as lock_file:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)

    def _write_state_unlocked(self, state: dict[str, Any]) -> None:
        """Write state atomically. Caller must hold self._lock."""
        directory = os.path.dirname(self.path)
        if directory:
            os.makedirs(directory, exist_ok=True)

        previous_state: dict[str, Any] | None = None
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                raw_previous = json.load(f)
            if isinstance(raw_previous, dict):
                previous_state = raw_previous
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            previous_state = None

        tmp_path = f"{self.path}.{os.getpid()}.tmp"
        try:
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(state, f, indent=2)
                f.write("\n")

            os.replace(tmp_path, self.path)
            logger.warning(
                "HID mode state write pid=%s process=%s path=%s prev=%s new=%s",
                os.getpid(),
                current_process().name,
                self.path,
                previous_state,
                state,
            )
        finally:
            try:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
            except OSError:
                pass

    def _normalize_state(self, state: Any) -> tuple[dict[str, Any], bool]:
        """Normalize loaded state and report whether it was modified."""
        if not isinstance(state, dict):
            return self._default_state(), True

        normalized = dict(state)
        changed = False

        active_mode = normalized.get("active_mode")
        normalized_mode = LEGACY_HID_MODE_ALIASES.get(str(active_mode), active_mode)
        if normalized_mode not in VALID_HID_MODES:
            normalized["active_mode"] = "keyboard"
            changed = True
        elif normalized_mode != active_mode:
            normalized["active_mode"] = normalized_mode
            changed = True
        if "source" not in normalized:
            normalized["source"] = "unknown"
            changed = True
        if not isinstance(normalized.get("sequence"), int):
            normalized["sequence"] = 0
            changed = True
        if "updated_at" not in normalized:
            normalized["updated_at"] = datetime.now(timezone.utc).isoformat()
            changed = True

        return normalized, changed

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
                state = dict(self._cache) if self._cache is not None else self._default_state()
                self._cache = state
                return dict(state)

            try:
                with open(self.path, "r", encoding="utf-8") as f:
                    raw_state = json.load(f)
            except FileNotFoundError:
                state = dict(self._cache) if self._cache is not None else self._default_state()
                self._cache = state
                return dict(state)
            except json.JSONDecodeError:
                state = dict(self._cache) if self._cache is not None else self._default_state()
                self._cache = state
                return dict(state)
            except OSError:
                if self._cache is not None:
                    return dict(self._cache)
                state = self._default_state()
                self._cache = state
                return dict(state)

            state, _changed = self._normalize_state(raw_state)
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
            mode: The HID mode to activate
            source: Source of the mode change (e.g., "gpio", "api")
        
        Returns:
            The new state dictionary
        """
        with self._lock:
            validated_mode = self._validate_mode(mode)

            with self._file_lock():
                # Load current state from disk to avoid stale cross-process cache.
                current = self.load(use_cache=False)

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

    def ensure_initialized(self) -> dict[str, Any]:
        """Ensure the backing file exists with a valid initial state."""
        with self._lock:
            with self._file_lock():
                if os.path.exists(self.path):
                    state = self.load(use_cache=False)
                else:
                    state = dict(self._cache) if self._cache is not None else self._default_state()
                    self._write_state_unlocked(state)
                    self._cache = state
                return dict(state)

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
        return self.save(new_mode, source=source)

    def toggle_mode(self, source: str = "gpio") -> dict[str, Any]:
        """Backward-compatible alias for cycling HID modes."""
        return self.cycle_mode(source=source)
