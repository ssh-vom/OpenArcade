import json
import os
import threading
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict, Optional


DEFAULT_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")


class ConfigStore:
    def __init__(self, path: str = DEFAULT_CONFIG_PATH, schema_version: int = 1) -> None:
        self.path = path
        self.schema_version = schema_version
        self._lock = threading.Lock()
        self._data: Dict[str, Any] = self._default_state()

    def _default_state(self) -> Dict[str, Any]:
        return {"schema_version": self.schema_version, "devices": {}}

    def load(self) -> Dict[str, Any]:
        with self._lock:
            if not os.path.exists(self.path):
                self._data = self._default_state()
                return deepcopy(self._data)

            try:
                with open(self.path, "r", encoding="utf-8") as handle:
                    self._data = json.load(handle)
            except (json.JSONDecodeError, OSError):
                self._data = self._default_state()

            if "schema_version" not in self._data:
                self._data["schema_version"] = self.schema_version
            if "devices" not in self._data:
                self._data["devices"] = {}
            else:
                for device in self._data["devices"].values():
                    if "connected" not in device:
                        device["connected"] = False

            return deepcopy(self._data)

    def save(self) -> None:
        with self._lock:
            data = deepcopy(self._data)
            tmp_path = f"{self.path}.tmp"
            with open(tmp_path, "w", encoding="utf-8") as handle:
                json.dump(data, handle, indent=2, sort_keys=True)
                handle.write("\n")
            os.replace(tmp_path, self.path)

    def get_all(self) -> Dict[str, Any]:
        with self._lock:
            return deepcopy(self._data)

    def get_device(self, device_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            device = self._data.get("devices", {}).get(device_id)
            return deepcopy(device) if device else None

    def upsert_device(self, device_id: str, updates: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        with self._lock:
            device = self._get_or_create_device_locked(device_id)

            if updates:
                device.update(updates)

            return deepcopy(device)

    def set_last_seen(self, device_id: str) -> Dict[str, Any]:
        timestamp = datetime.now(timezone.utc).isoformat()
        return self.upsert_device(device_id, {"last_seen": timestamp})

    def set_connected(self, device_id: str, connected: bool) -> Dict[str, Any]:
        updates = {"connected": bool(connected)}
        if connected:
            updates["last_seen"] = datetime.now(timezone.utc).isoformat()
        return self.upsert_device(device_id, updates)

    def set_descriptor(self, device_id: str, descriptor: Dict[str, Any]) -> Dict[str, Any]:
        return self.upsert_device(device_id, {"descriptor": descriptor})

    def set_active_mode(self, device_id: str, mode: str) -> Dict[str, Any]:
        return self.upsert_device(device_id, {"active_mode": mode})

    def set_mapping(self, device_id: str, mode: str, control_id: str, mapping: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            device = self._get_or_create_device_locked(device_id)
            device.setdefault("modes", {}).setdefault(mode, {"output": None, "mapping": {}})
            device["modes"][mode].setdefault("mapping", {})
            device["modes"][mode]["mapping"][str(control_id)] = mapping
            return deepcopy(device)

    def _get_or_create_device_locked(self, device_id: str) -> Dict[str, Any]:
        devices = self._data.setdefault("devices", {})
        device = devices.get(device_id)
        if device is None:
            device = {
                "device_id": device_id,
                "last_seen": None,
                "connected": False,
                "descriptor": None,
                "active_mode": "keyboard",
                "modes": {
                    "keyboard": {"output": "hid_keyboard", "mapping": {}},
                    "gamepad": {"output": "hid_gamepad", "mapping": {}},
                },
                "ui": {"layout": {}},
            }
            devices[device_id] = device
        return device
