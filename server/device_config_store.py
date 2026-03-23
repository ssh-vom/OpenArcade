from __future__ import annotations

import json
import os
import threading
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any


OPENARCADE_CONFIG_PATH_ENV_VAR = "OPENARCADE_CONFIG_PATH"
LEGACY_DEVICE_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")


def resolve_default_config_path() -> str:
    return os.environ.get(OPENARCADE_CONFIG_PATH_ENV_VAR, LEGACY_DEVICE_CONFIG_PATH)


class DeviceConfigStore:
    def __init__(self, path: str | None = None, schema_version: int = 2) -> None:
        self.path = path or resolve_default_config_path()
        self.schema_version = schema_version
        self._lock = threading.Lock()
        self._data: dict[str, Any] = self._default_state()

    def _default_state(self) -> dict[str, Any]:
        return {"schema_version": self.schema_version, "devices": {}}

    def _default_modes(self) -> dict[str, Any]:
        return {
            "keyboard": {"output": "hid_keyboard", "mapping": {}},
            "gamepad": {"output": "hid_gamepad", "mapping": {}},
        }

    def _make_profile(
        self,
        profile_id: str,
        name: str = "Default",
        plate_id: str = "button-module-v1",
        active_mode: str = "keyboard",
        modes: dict[str, Any] | None = None,
        layout: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return {
            "id": profile_id,
            "name": name,
            "plate_id": plate_id,
            "active_mode": active_mode,
            "modes": deepcopy(modes) if isinstance(modes, dict) else self._default_modes(),
            "ui": {"layout": deepcopy(layout) if isinstance(layout, dict) else {}},
        }

    def _normalize_profile_locked(
        self, profile_id: str, profile: dict[str, Any] | None
    ) -> dict[str, Any]:
        source = profile if isinstance(profile, dict) else {}
        ui = source.get("ui") if isinstance(source.get("ui"), dict) else {}
        layout = ui.get("layout") if isinstance(ui.get("layout"), dict) else {}

        normalized = self._make_profile(
            profile_id=profile_id,
            name=str(source.get("name") or "Default"),
            plate_id=str(source.get("plate_id") or "button-module-v1"),
            active_mode=str(source.get("active_mode") or "keyboard"),
            modes=source.get("modes") if isinstance(source.get("modes"), dict) else None,
            layout=layout,
        )
        normalized["id"] = str(source.get("id") or profile_id)
        return normalized

    def _migrate_device_locked(self, device_id: str, device: dict[str, Any]) -> None:
        device["device_id"] = device_id
        if "last_seen" not in device:
            device["last_seen"] = None
        if "connected" not in device:
            device["connected"] = False
        if "descriptor" not in device:
            device["descriptor"] = None

        has_v1_fields = any(key in device for key in ("active_mode", "modes", "ui"))
        profiles = device.get("profiles")

        if has_v1_fields:
            profile_id = str(uuid.uuid4())
            raw_ui = device.get("ui") if isinstance(device.get("ui"), dict) else {}
            layout = raw_ui.get("layout") if isinstance(raw_ui.get("layout"), dict) else {}
            modes = device.get("modes") if isinstance(device.get("modes"), dict) else None
            profile = self._make_profile(
                profile_id=profile_id,
                active_mode=str(device.get("active_mode") or "keyboard"),
                modes=modes,
                layout=layout,
            )
            device["profiles"] = {profile_id: profile}
            device["active_profile"] = profile_id
            device.pop("active_mode", None)
            device.pop("modes", None)
            device.pop("ui", None)
            return

        if not isinstance(profiles, dict) or not profiles:
            profile_id = str(uuid.uuid4())
            device["profiles"] = {profile_id: self._make_profile(profile_id=profile_id)}
            device["active_profile"] = profile_id
            return

        normalized_profiles: dict[str, Any] = {}
        for maybe_profile_id, maybe_profile in profiles.items():
            profile_id = str(maybe_profile_id)
            normalized_profiles[profile_id] = self._normalize_profile_locked(
                profile_id, maybe_profile if isinstance(maybe_profile, dict) else None
            )

        if not normalized_profiles:
            profile_id = str(uuid.uuid4())
            normalized_profiles[profile_id] = self._make_profile(profile_id=profile_id)

        active_profile = str(device.get("active_profile") or "")
        if active_profile not in normalized_profiles:
            active_profile = next(iter(normalized_profiles))

        device["profiles"] = normalized_profiles
        device["active_profile"] = active_profile

    def load(self) -> dict[str, Any]:
        with self._lock:
            if not os.path.exists(self.path):
                self._data = self._default_state()
                return deepcopy(self._data)

            try:
                with open(self.path, "r", encoding="utf-8") as handle:
                    self._data = json.load(handle)
            except (json.JSONDecodeError, OSError):
                self._data = self._default_state()

            if not isinstance(self._data, dict):
                self._data = self._default_state()

            devices = self._data.get("devices")
            if not isinstance(devices, dict):
                devices = {}
                self._data["devices"] = devices

            for device_id, raw_device in list(devices.items()):
                if not isinstance(raw_device, dict):
                    raw_device = {}
                    devices[device_id] = raw_device
                self._migrate_device_locked(str(device_id), raw_device)

            self._data["schema_version"] = self.schema_version
            return deepcopy(self._data)

    def save(self) -> None:
        with self._lock:
            data = deepcopy(self._data)
            tmp_path = f"{self.path}.tmp"
            directory = os.path.dirname(self.path)
            if directory:
                os.makedirs(directory, exist_ok=True)
            with open(tmp_path, "w", encoding="utf-8") as handle:
                json.dump(data, handle, indent=2, sort_keys=True)
                handle.write("\n")
            os.replace(tmp_path, self.path)

    def get_all(self) -> dict[str, Any]:
        with self._lock:
            return deepcopy(self._data)

    def get_device(self, device_id: str) -> dict[str, Any] | None:
        with self._lock:
            device = self._data.get("devices", {}).get(device_id)
            return deepcopy(device) if device else None

    def upsert_device(
        self, device_id: str, updates: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        with self._lock:
            device = self._get_or_create_device_locked(device_id)
            if updates:
                device.update(updates)
            return deepcopy(device)

    def set_last_seen(self, device_id: str) -> dict[str, Any]:
        timestamp = datetime.now(timezone.utc).isoformat()
        return self.upsert_device(device_id, {"last_seen": timestamp})

    def set_descriptor(
        self, device_id: str, descriptor: dict[str, Any]
    ) -> dict[str, Any]:
        return self.upsert_device(device_id, {"descriptor": descriptor})

    def set_device_name(self, device_id: str, name: str) -> dict[str, Any]:
        """Set a human-readable nickname for a device. Stored at the device root."""
        return self.upsert_device(device_id, {"name": name.strip()})

    def list_profiles(self, device_id: str) -> list[dict[str, Any]]:
        with self._lock:
            device = self._data.get("devices", {}).get(device_id)
            if not isinstance(device, dict):
                return []
            profiles = device.get("profiles")
            if not isinstance(profiles, dict):
                return []
            return [deepcopy(profile) for profile in profiles.values() if isinstance(profile, dict)]

    def get_active_profile(self, device_id: str) -> dict[str, Any] | None:
        with self._lock:
            device = self._data.get("devices", {}).get(device_id)
            if not isinstance(device, dict):
                return None
            self._migrate_device_locked(device_id, device)
            profile_id = device.get("active_profile")
            if not isinstance(profile_id, str):
                return None
            profile = device.get("profiles", {}).get(profile_id)
            return deepcopy(profile) if isinstance(profile, dict) else None

    def create_profile(self, device_id: str, name: str, plate_id: str) -> dict[str, Any]:
        with self._lock:
            device = self._get_or_create_device_locked(device_id)
            active_profile = self._get_active_profile_locked(device_id)
            new_profile_id = str(uuid.uuid4())

            active_ui = (
                active_profile.get("ui")
                if isinstance(active_profile.get("ui"), dict)
                else {}
            )
            active_layout = (
                active_ui.get("layout") if isinstance(active_ui.get("layout"), dict) else {}
            )

            new_profile = self._make_profile(
                profile_id=new_profile_id,
                name=name,
                plate_id=plate_id,
                active_mode=str(active_profile.get("active_mode") or "keyboard"),
                modes=active_profile.get("modes")
                if isinstance(active_profile.get("modes"), dict)
                else None,
                layout=active_layout,
            )
            device.setdefault("profiles", {})[new_profile_id] = new_profile
            return deepcopy(new_profile)

    def delete_profile(self, device_id: str, profile_id: str) -> dict[str, Any]:
        with self._lock:
            device = self._get_or_create_device_locked(device_id)
            profiles = device.get("profiles")
            if not isinstance(profiles, dict) or profile_id not in profiles:
                raise KeyError(profile_id)
            if len(profiles) <= 1:
                raise ValueError("cannot_delete_only_profile")
            if device.get("active_profile") == profile_id:
                raise ValueError("cannot_delete_active_profile")
            profiles.pop(profile_id)
            return deepcopy(device)

    def set_active_profile(self, device_id: str, profile_id: str) -> dict[str, Any]:
        with self._lock:
            device = self._get_or_create_device_locked(device_id)
            profiles = device.get("profiles")
            if not isinstance(profiles, dict) or profile_id not in profiles:
                raise KeyError(profile_id)
            device["active_profile"] = profile_id
            return deepcopy(device)

    def rename_profile(self, device_id: str, profile_id: str, name: str) -> dict[str, Any]:
        with self._lock:
            device = self._get_or_create_device_locked(device_id)
            profiles = device.get("profiles")
            if not isinstance(profiles, dict) or profile_id not in profiles:
                raise KeyError(profile_id)
            profiles[profile_id]["name"] = name
            return deepcopy(device)

    def set_profile_plate(
        self, device_id: str, profile_id: str, plate_id: str
    ) -> dict[str, Any]:
        with self._lock:
            device = self._get_or_create_device_locked(device_id)
            profiles = device.get("profiles")
            if not isinstance(profiles, dict) or profile_id not in profiles:
                raise KeyError(profile_id)
            profiles[profile_id]["plate_id"] = plate_id
            return deepcopy(device)

    def set_active_mode(self, device_id: str, mode: str) -> dict[str, Any]:
        with self._lock:
            active_profile = self._get_active_profile_locked(device_id)
            active_profile["active_mode"] = mode
            return deepcopy(self._data.get("devices", {}).get(device_id))

    def set_mapping(
        self, device_id: str, mode: str, control_id: str, mapping: dict[str, Any]
    ) -> dict[str, Any]:
        with self._lock:
            device = self._get_or_create_device_locked(device_id)
            active_profile = self._get_active_profile_locked(device_id)
            active_profile.setdefault("modes", {}).setdefault(
                mode, {"output": None, "mapping": {}}
            )
            active_profile["modes"][mode].setdefault("mapping", {})
            active_profile["modes"][mode]["mapping"][str(control_id)] = mapping
            return deepcopy(device)

    def set_ui_binding(
        self,
        device_id: str,
        ui_button: str,
        control_id: str,
        strategy: str = "swap",
    ) -> dict[str, Any]:
        with self._lock:
            device = self._get_or_create_device_locked(device_id)
            active_profile = self._get_active_profile_locked(device_id)

            ui_config = active_profile.setdefault("ui", {})
            layout = ui_config.setdefault("layout", {})
            normalized_control_id = str(control_id)
            previous_control_id = layout.get(ui_button)

            existing_button = None
            for button_name, assigned_control_id in layout.items():
                if button_name == ui_button:
                    continue
                if str(assigned_control_id) == normalized_control_id:
                    existing_button = button_name
                    break

            if existing_button is not None:
                if strategy == "swap" and previous_control_id is not None:
                    layout[existing_button] = previous_control_id
                else:
                    layout.pop(existing_button, None)

            layout[ui_button] = normalized_control_id
            return deepcopy(device)

    def _get_or_create_device_locked(self, device_id: str) -> dict[str, Any]:
        devices = self._data.setdefault("devices", {})
        device = devices.get(device_id)
        if not isinstance(device, dict):
            device = {
                "device_id": device_id,
                "last_seen": None,
                "connected": False,
                "descriptor": None,
                "active_profile": "",
                "profiles": {},
            }
            devices[device_id] = device
        self._migrate_device_locked(device_id, device)
        return device

    def _get_active_profile_locked(self, device_id: str) -> dict[str, Any]:
        device = self._get_or_create_device_locked(device_id)
        profiles = device.setdefault("profiles", {})
        if not isinstance(profiles, dict) or not profiles:
            profile_id = str(uuid.uuid4())
            profiles = {profile_id: self._make_profile(profile_id=profile_id)}
            device["profiles"] = profiles
            device["active_profile"] = profile_id

        active_profile_id = str(device.get("active_profile") or "")
        if active_profile_id not in profiles:
            active_profile_id = next(iter(profiles))
            device["active_profile"] = active_profile_id

        active_profile = profiles.get(active_profile_id)
        if not isinstance(active_profile, dict):
            active_profile = self._make_profile(profile_id=active_profile_id)
            profiles[active_profile_id] = active_profile

        return active_profile
