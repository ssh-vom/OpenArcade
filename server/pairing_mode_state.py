"""
Pairing Mode State Manager

Manages the global pairing mode state that controls whether BLE scanning
and device discovery is enabled. This is the source of truth for pairing
mode across the entire system.
"""

from __future__ import annotations

import json
import logging
import os
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from multiprocessing import current_process
from typing import Any, Iterator

import fcntl


logger = logging.getLogger("OpenArcade")

OPENARCADE_PAIRING_MODE_PATH_ENV_VAR = "OPENARCADE_PAIRING_MODE_PATH"
OPENARCADE_PAIRING_DEFAULT_ENABLED_ENV_VAR = "OPENARCADE_PAIRING_DEFAULT_ENABLED"
DEFAULT_PAIRING_MODE_PATH = "/var/lib/openarcade/pairing_mode.json"


def resolve_pairing_mode_path() -> str:
    """Get the pairing mode state file path from environment or use default."""
    return os.environ.get(
        OPENARCADE_PAIRING_MODE_PATH_ENV_VAR,
        DEFAULT_PAIRING_MODE_PATH,
    )


def _get_default_enabled() -> bool:
    """Get default pairing enabled state from environment."""
    raw = os.environ.get(OPENARCADE_PAIRING_DEFAULT_ENABLED_ENV_VAR, "").lower()
    return raw in ("true", "1", "yes", "on")


class PairingModeState:
    """
    Manages persistent pairing mode state across the system.

    The state includes:
    - enabled: whether pairing/scanning is enabled
    - source: where the mode change originated (e.g., "gpio", "api", "default")
    - sequence: incrementing counter for change tracking
    - updated_at: ISO timestamp of last change
    """

    def __init__(self, path: str | None = None) -> None:
        self.path = path or resolve_pairing_mode_path()
        self._lock = threading.RLock()
        self._cache: dict[str, Any] | None = None

    def _default_state(self) -> dict[str, Any]:
        return {
            "enabled": _get_default_enabled(),
            "source": "default",
            "sequence": 0,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    @property
    def _lock_path(self) -> str:
        return f"{self.path}.lock"

    @contextmanager
    def _file_lock(self) -> Iterator[None]:
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
            logger.info(
                "Pairing mode state write pid=%s process=%s path=%s prev=%s new=%s",
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
        if not isinstance(state, dict):
            return self._default_state(), True

        normalized = dict(state)
        changed = False

        if not isinstance(normalized.get("enabled"), bool):
            normalized["enabled"] = _get_default_enabled()
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

    def save(self, enabled: bool, source: str = "api") -> dict[str, Any]:
        with self._lock:
            with self._file_lock():
                current = self.load(use_cache=False)
                new_state = {
                    "enabled": enabled,
                    "source": source,
                    "sequence": current.get("sequence", 0) + 1,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                self._write_state_unlocked(new_state)

            self._cache = new_state
            return dict(new_state)

    def toggle(self, source: str = "gpio") -> dict[str, Any]:
        return self.save(enabled=not self.is_enabled(), source=source)

    def is_enabled(self, use_cache: bool = False) -> bool:
        state = self.load(use_cache=use_cache)
        return state.get("enabled", False)

    def get_sequence(self, use_cache: bool = False) -> int:
        state = self.load(use_cache=use_cache)
        return state.get("sequence", 0)

    def ensure_initialized(self) -> dict[str, Any]:
        with self._lock:
            with self._file_lock():
                if os.path.exists(self.path):
                    state = self.load(use_cache=False)
                else:
                    state = dict(self._cache) if self._cache is not None else self._default_state()
                    self._write_state_unlocked(state)
                    self._cache = state
                return dict(state)
