"""
Base class for persistent JSON state management.

Provides thread-safe, cross-process safe (optional) state persistence
with caching and atomic writes.
"""

from __future__ import annotations

import json
import logging
import os
import threading
from abc import ABC, abstractmethod
from contextlib import contextmanager
from datetime import datetime, timezone
from multiprocessing import current_process
from typing import Any, Iterator

import fcntl


logger = logging.getLogger("OpenArcade")


class StateManager(ABC):
    """
    Base class for persistent JSON state management.
    
    Subclasses must implement:
    - _default_state(): Return default state dictionary
    - _normalize_state(): Normalize and validate loaded state
    
    Optional overrides:
    - _use_file_locking(): Return False to disable cross-process locking
    - _log_level(): Return logging level for writes (default INFO)
    """

    def __init__(self, path: str) -> None:
        self.path = path
        self._lock = threading.RLock()
        self._cache: dict[str, Any] | None = None

    @abstractmethod
    def _default_state(self) -> dict[str, Any]:
        """Return default state dictionary when file doesn't exist."""
        ...

    @abstractmethod
    def _normalize_state(self, state: Any) -> dict[str, Any]:
        """Normalize and validate loaded state. Return normalized dict."""
        ...

    def _use_file_locking(self) -> bool:
        """Override to return False if cross-process locking is not needed."""
        return True

    def _log_level(self) -> int:
        """Logging level for state writes. Override for WARNING (e.g., HID mode)."""
        return logging.INFO

    @property
    def _lock_path(self) -> str:
        return f"{self.path}.lock"

    @contextmanager
    def _file_lock(self) -> Iterator[None]:
        """Cross-process file lock for state mutations."""
        if not self._use_file_locking():
            yield
            return

        directory = os.path.dirname(self._lock_path)
        if directory:
            os.makedirs(directory, exist_ok=True)

        with open(self._lock_path, "a+", encoding="utf-8") as lock_file:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)

    def _write_state(self, state: dict[str, Any]) -> None:
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
            log_fn = logger.log if hasattr(logger, 'log') else logger.info
            log_level = self._log_level()
            if log_fn:
                log_fn(
                    log_level,
                    "State write pid=%s process=%s path=%s prev=%s new=%s",
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

    def load(self, use_cache: bool = False) -> dict[str, Any]:
        """
        Load current state.
        
        Args:
            use_cache: If True, return cached value without reading file
        
        Returns:
            State dictionary
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

            state = self._normalize_state(raw_state)
            self._cache = state
            return dict(state)

    def save(self, state: dict[str, Any]) -> dict[str, Any]:
        """
        Save state dictionary atomically.
        
        Args:
            state: Complete state dictionary to save
        
        Returns:
            The saved state dictionary
        """
        with self._lock:
            with self._file_lock():
                self._write_state(state)
            self._cache = state
            return dict(state)

    def ensure_initialized(self) -> dict[str, Any]:
        """Ensure the backing file exists with a valid initial state."""
        with self._lock:
            if not self._use_file_locking():
                if os.path.exists(self.path):
                    return self.load(use_cache=False)
                state = self._default_state()
                self._write_state(state)
                self._cache = state
                return dict(state)

            with self._file_lock():
                if os.path.exists(self.path):
                    state = self.load(use_cache=False)
                else:
                    state = dict(self._cache) if self._cache is not None else self._default_state()
                    self._write_state(state)
                    self._cache = state
                return dict(state)

    def get_sequence(self, use_cache: bool = False) -> int:
        """Get the current sequence number."""
        state = self.load(use_cache=use_cache)
        return state.get("sequence", 0)
