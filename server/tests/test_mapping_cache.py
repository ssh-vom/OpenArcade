import os
import tempfile
import unittest

import constants as const
from device_config_store import DeviceConfigStore
from runtime.report_builder import build_mapping_cache, get_pressed_control_ids
from runtime.state_reducer import StateReducer


class MappingCacheTestCase(unittest.TestCase):
    def test_build_mapping_cache_uses_latest_config(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "config.json")
            store = DeviceConfigStore(path=path)
            store.load()

            device_id = "AA:BB:CC:DD:EE:FF"
            store.set_mapping(device_id, "keyboard", "1", {"keycode": "HID_KEY_A"})
            store.save()

            cache = build_mapping_cache(store.load())
            self.assertEqual(cache[device_id][0], const.HID_KEY_A)

            store.set_mapping(device_id, "keyboard", "1", {"keycode": "HID_KEY_B"})
            store.save()

            cache = build_mapping_cache(store.load())
            self.assertEqual(cache[device_id][0], const.HID_KEY_B)

    def test_state_reducer_rebuilds_report_when_mapping_changes(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "config.json")
            store = DeviceConfigStore(path=path)
            store.load()

            device_id = "AA:BB:CC:DD:EE:FF"
            store.set_mapping(device_id, "keyboard", "1", {"keycode": "HID_KEY_A"})
            store.save()

            reducer = StateReducer(build_mapping_cache(store.load()))
            report = reducer.update_device_state(device_id, 1 << 0)
            self.assertIsNotNone(report)
            assert report is not None
            self.assertEqual(report[2], const.HID_KEY_A)

            store.set_mapping(device_id, "keyboard", "1", {"keycode": "HID_KEY_B"})
            store.save()

            report = reducer.set_mapping_cache(build_mapping_cache(store.load()))
            self.assertEqual(report[2], const.HID_KEY_B)

    def test_pressed_control_ids_follow_default_descriptor(self):
        device_config = {
            "descriptor": None,
        }

        pressed = get_pressed_control_ids(
            device_config,
            (1 << 0) | (1 << 8) | (1 << 10) | (1 << 13) | (1 << 14),
        )

        self.assertEqual(pressed, ["1", "18", "16", "14", "15"])


if __name__ == "__main__":
    unittest.main()
