from __future__ import annotations

import json
import logging
import os
import threading
from datetime import datetime, timezone
from typing import Any, Literal, cast


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


class GadgetState:
    def __init__(self, path: str | None = None) -> None:
        self.path = path or resolve_gadget_state_path()
        self._lock = threading.RLock()
        self._cache: dict[str, Any] | None = None

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

    def load(self, use_cache: bool = False) -> dict[str, Any]:
        with self._lock:
            if use_cache and self._cache is not None:
                return dict(self._cache)

            try:
                with open(self.path, "r", encoding="utf-8") as handle:
                    raw_state = json.load(handle)
            except (FileNotFoundError, json.JSONDecodeError, OSError):
                state = self._default_state()
                self._cache = state
                return dict(state)

            state = self._normalize_state(raw_state)
            self._cache = state
            return dict(state)

    def save(
        self,
        persona: GadgetPersona,
        ready: bool,
        mode_sequence: int,
    ) -> dict[str, Any]:
        with self._lock:
            if persona not in VALID_GADGET_PERSONAS:
                raise ValueError(f"Invalid gadget persona: {persona}")

            state = {
                "persona": cast(GadgetPersona, persona),
                "ready": ready,
                "mode_sequence": mode_sequence,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            directory = os.path.dirname(self.path)
            if directory:
                os.makedirs(directory, exist_ok=True)

            tmp_path = f"{self.path}.{os.getpid()}.tmp"
            try:
                with open(tmp_path, "w", encoding="utf-8") as handle:
                    json.dump(state, handle, indent=2)
                    handle.write("\n")
                os.replace(tmp_path, self.path)
            finally:
                try:
                    if os.path.exists(tmp_path):
                        os.unlink(tmp_path)
                except OSError:
                    pass

            self._cache = state
            logger.info(
                "Gadget state updated persona=%s ready=%s mode_sequence=%s path=%s",
                persona,
                ready,
                mode_sequence,
                self.path,
            )
            return dict(state)

    def ensure_initialized(self) -> dict[str, Any]:
        with self._lock:
            if os.path.exists(self.path):
                state = self.load(use_cache=False)
            else:
                state = self._default_state()
                self.save(
                    persona=cast(GadgetPersona, state["persona"]),
                    ready=bool(state["ready"]),
                    mode_sequence=int(state["mode_sequence"]),
                )
            return dict(state)
