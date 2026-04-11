import os
import tempfile
import unittest

import config_command_service
from device_config_store import DeviceConfigStore


class ConfigCommandServiceTestCase(unittest.TestCase):
    def test_unknown_command_returns_error(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "config.json")
            store = DeviceConfigStore(path=path)
            store.load()

            response, should_notify = config_command_service.handle_command(
                store,
                {"cmd": "does_not_exist"},
            )

            self.assertFalse(response["ok"])
            self.assertEqual(response["error"], "unknown_cmd")
            self.assertFalse(should_notify)

    def test_set_mapping_notifies_runtime(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "config.json")
            store = DeviceConfigStore(path=path)
            store.load()

            response, should_notify = config_command_service.handle_command(
                store,
                {
                    "cmd": "set_mapping",
                    "device_id": "AA:BB:CC:DD:EE:FF",
                    "mode": "keyboard",
                    "control_id": "1",
                    "mapping": {"keycode": "HID_KEY_Z"},
                },
            )

            self.assertTrue(response["ok"])
            self.assertTrue(should_notify)

    def test_list_devices_marks_connected_devices(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "config.json")
            store = DeviceConfigStore(path=path)
            store.load()
            store.upsert_device("AA:BB:CC:DD:EE:FF")
            store.save()

            original_get_connected_devices = config_command_service.get_connected_devices
            config_command_service.get_connected_devices = lambda: {"AA:BB:CC:DD:EE:FF"}
            try:
                response, should_notify = config_command_service.handle_command(
                    store,
                    {"cmd": "list_devices"},
                )
            finally:
                config_command_service.get_connected_devices = original_get_connected_devices

            self.assertTrue(response["ok"])
            self.assertFalse(should_notify)
            self.assertTrue(response["devices"]["AA:BB:CC:DD:EE:FF"]["connected"])


if __name__ == "__main__":
    unittest.main()
