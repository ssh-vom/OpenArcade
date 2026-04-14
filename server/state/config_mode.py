"""
Config Mode State Manager

Manages the global config mode state that controls whether hotspot + local
configuration portal behavior should be enabled.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from core.state import StateManager


OPENARCADE_CONFIG_MODE_PATH_ENV_VAR = "OPENARCADE_CONFIG_MODE_PATH"
DEFAULT_CONFIG_MODE_PATH = "/var/lib/openarcade/config_mode.json"


def resolve_config_mode_path() -> str:
    """Get the config mode state file path from environment or use default."""
    return os.environ.get(
        OPENARCADE_CONFIG_MODE_PATH_ENV_VAR,
        DEFAULT_CONFIG_MODE_PATH,
    )


class ConfigModeState(StateManager):
    """
    Manages persistent config mode state across the system.

    The state includes:
    - enabled: whether config mode is enabled
    - source: where the mode change originated (e.g., "gpio", "api", "default")
    - sequence: incrementing counter for change tracking
    - updated_at: ISO timestamp of last change
    """

    def __init__(self, path: str | None = None) -> None:
        super().__init__(path or resolve_config_mode_path())

    def _default_state(self) -> dict[str, Any]:
        return {
            "enabled": False,
            "source": "default",
            "sequence": 0,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    def _normalize_state(self, state: Any) -> dict[str, Any]:
        if not isinstance(state, dict):
            return self._default_state()

        normalized = dict(state)
        if not isinstance(normalized.get("enabled"), bool):
            normalized["enabled"] = False
        if "source" not in normalized:
            normalized["source"] = "unknown"
        if not isinstance(normalized.get("sequence"), int):
            normalized["sequence"] = 0
        if "updated_at" not in normalized:
            normalized["updated_at"] = datetime.now(timezone.utc).isoformat()
        return normalized

    def save_enabled(self, enabled: bool, source: str = "api") -> dict[str, Any]:
        """Save config mode enabled state."""
        current = self.load(use_cache=False)
        new_state = {
            "enabled": enabled,
            "source": source,
            "sequence": current.get("sequence", 0) + 1,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        return self.save(new_state)

    def toggle(self, source: str = "gpio") -> dict[str, Any]:
        """Toggle config mode enabled state."""
        return self.save_enabled(enabled=not self.is_enabled(), source=source)

    def is_enabled(self, use_cache: bool = False) -> bool:
        """Check if config mode is enabled."""
        state = self.load(use_cache=use_cache)
        return state.get("enabled", False)
