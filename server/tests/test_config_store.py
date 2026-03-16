import json
import os
import tempfile
import unittest

from device_config_store import OPENARCADE_CONFIG_PATH_ENV_VAR, DeviceConfigStore
from default_descriptor import default_descriptor


class ConfigStoreTestCase(unittest.TestCase):
    def test_load_defaults(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "config.json")
            store = DeviceConfigStore(path=path)
            data = store.load()

            self.assertEqual(data["schema_version"], 1)
            self.assertEqual(data["devices"], {})

    def test_upsert_save_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "config.json")
            store = DeviceConfigStore(path=path)
            store.load()

            device_id = "AA:BB:CC:DD:EE:FF"
            descriptor = default_descriptor().to_dict()

            store.set_descriptor(device_id, descriptor)
            store.set_last_seen(device_id)
            store.set_mapping(device_id, "keyboard", "1", {"keycode": "HID_KEY_Z"})
            store.set_active_mode(device_id, "keyboard")
            store.save()

            self.assertTrue(os.path.exists(path))
            with open(path, "r", encoding="utf-8") as handle:
                on_disk = json.load(handle)

            self.assertIn(device_id, on_disk["devices"])
            self.assertEqual(
                on_disk["devices"][device_id]["descriptor"]["control_count"],
                descriptor["control_count"],
            )
            self.assertEqual(
                on_disk["devices"][device_id]["modes"]["keyboard"]["mapping"]["1"],
                {"keycode": "HID_KEY_Z"},
            )

            reloaded = DeviceConfigStore(path=path)
            data = reloaded.load()
            self.assertIn(device_id, data["devices"])
            self.assertEqual(
                data["devices"][device_id]["modes"]["keyboard"]["mapping"]["1"],
                {"keycode": "HID_KEY_Z"},
            )

    def test_set_mapping_creates_device(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "config.json")
            store = DeviceConfigStore(path=path)
            store.load()

            device_id = "11:22:33:44:55:66"
            store.set_mapping(device_id, "keyboard", "2", {"keycode": "HID_KEY_C"})
            device = store.get_device(device_id)

            self.assertIsNotNone(device)
            assert device is not None
            self.assertEqual(device["active_mode"], "keyboard")
            self.assertEqual(
                device["modes"]["keyboard"]["mapping"]["2"],
                {"keycode": "HID_KEY_C"},
            )

    def test_set_ui_binding_swaps_existing_owner(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "config.json")
            store = DeviceConfigStore(path=path)
            store.load()

            device_id = "11:22:33:44:55:66"
            store.upsert_device(
                device_id,
                {
                    "ui": {
                        "layout": {
                            "button_1": "1",
                            "button_2": "2",
                        }
                    }
                },
            )

            store.set_ui_binding(device_id, "button_1", "2")
            device = store.get_device(device_id)

            self.assertIsNotNone(device)
            assert device is not None
            self.assertEqual(device["ui"]["layout"]["button_1"], "2")
            self.assertEqual(device["ui"]["layout"]["button_2"], "1")

    def test_default_path_comes_from_environment(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "state", "config.json")
            original = os.environ.get(OPENARCADE_CONFIG_PATH_ENV_VAR)
            os.environ[OPENARCADE_CONFIG_PATH_ENV_VAR] = path
            try:
                store = DeviceConfigStore()
                self.assertEqual(store.path, path)
                store.load()
                store.save()
                self.assertTrue(os.path.exists(path))
            finally:
                if original is None:
                    os.environ.pop(OPENARCADE_CONFIG_PATH_ENV_VAR, None)
                else:
                    os.environ[OPENARCADE_CONFIG_PATH_ENV_VAR] = original


if __name__ == "__main__":
    unittest.main()
