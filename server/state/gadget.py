"""
Gadget State Manager

Manages the USB gadget state (persona and readiness) that is shared
between the gadget mode manager and the HID writer process.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any, Literal, cast

from core.state import StateManager


logger = logging.getLogger("OpenArcade")

GadgetPersona = Literal["pc", "switch-hori"]
VALID_GADGET_PERSONAS: tuple[GadgetPersona, ...] = ("pc", "switch-hori")

OPENARCADE_GADGET_STATE_PATH_ENV_VAR = "OPENARCADE_GADGET_STATE_PATH"
DEFAULT_GADGET_STATE_PATH = "/var/lib/openarcade/gadget_state.json"


def resolve_gadget_state_path() -> str:
    return os.environ.get(
        OPENARCADE_GADGET_STATE_PATH_ENV_VAR,
        DEFAULT_GADGET_STATE_PATH,
    )


class GadgetState(StateManager):
    """Manages persistent gadget state."""

    def __init__(self, path: str | None = None) -> None:
        super().__init__(path or resolve_gadget_state_path())

    def _default_state(self) -> dict[str, Any]:
        return {
            "persona": "pc",
            "ready": False,
            "mode_sequence": -1,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

    def _normalize_state(self, state: Any) -> dict[str, Any]:
        if not isinstance(state, dict):
            return self._default_state()

        normalized = dict(state)
        persona = normalized.get("persona")
        if persona not in VALID_GADGET_PERSONAS:
            normalized["persona"] = "pc"
        if not isinstance(normalized.get("ready"), bool):
            normalized["ready"] = False
        if not isinstance(normalized.get("mode_sequence"), int):
            normalized["mode_sequence"] = -1
        if not isinstance(normalized.get("updated_at"), str):
            normalized["updated_at"] = datetime.now(timezone.utc).isoformat()
        return normalized

    def _use_file_locking(self) -> bool:
        """Gadget state is only accessed by single process, no locking needed."""
        return False

    def save_state(
        self,
        persona: GadgetPersona,
        ready: bool,
        mode_sequence: int,
    ) -> dict[str, Any]:
        """Save gadget state with logging."""
        if persona not in VALID_GADGET_PERSONAS:
            raise ValueError(f"Invalid gadget persona: {persona}")

        state = {
            "persona": cast(GadgetPersona, persona),
            "ready": ready,
            "mode_sequence": mode_sequence,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        result = self.save(state)
        logger.info(
            "Gadget state updated persona=%s ready=%s mode_sequence=%s path=%s",
            persona,
            ready,
            mode_sequence,
            self.path,
        )
        return result
