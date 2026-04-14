"""
Pairing Mode State Manager

Manages the global pairing mode state that controls whether BLE scanning
and device discovery is enabled. This is the source of truth for pairing
mode across the entire system.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from core.state import StateManager


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


class PairingModeState(StateManager):
    """
    Manages persistent pairing mode state across the system.

    The state includes:
    - enabled: whether pairing/scanning is enabled
    - source: where the mode change originated (e.g., "gpio", "api", "default")
    - sequence: incrementing counter for change tracking
    - updated_at: ISO timestamp of last change
    """

    def __init__(self, path: str | None = None) -> None:
        super().__init__(path or resolve_pairing_mode_path())

    def _default_state(self) -> dict[str, Any]:
        return {
            "enabled": _get_default_enabled(),
            "source": "default",
            "sequence": 0,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    def _normalize_state(self, state: Any) -> dict[str, Any]:
        if not isinstance(state, dict):
            return self._default_state()

        normalized = dict(state)
        if not isinstance(normalized.get("enabled"), bool):
            normalized["enabled"] = _get_default_enabled()
        if "source" not in normalized:
            normalized["source"] = "unknown"
        if not isinstance(normalized.get("sequence"), int):
            normalized["sequence"] = 0
        if "updated_at" not in normalized:
            normalized["updated_at"] = datetime.now(timezone.utc).isoformat()
        return normalized

    def save_enabled(self, enabled: bool, source: str = "api") -> dict[str, Any]:
        """Save pairing enabled state."""
        current = self.load(use_cache=False)
        new_state = {
            "enabled": enabled,
            "source": source,
            "sequence": current.get("sequence", 0) + 1,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        return self.save(new_state)

    def toggle(self, source: str = "gpio") -> dict[str, Any]:
        """Toggle pairing enabled state."""
        return self.save_enabled(enabled=not self.is_enabled(), source=source)

    def is_enabled(self, use_cache: bool = False) -> bool:
        """Check if pairing is enabled."""
        state = self.load(use_cache=use_cache)
        return state.get("enabled", False)
