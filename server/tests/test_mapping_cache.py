import os
import tempfile
import time
import unittest

import constants as const
from aggregator import refresh_mapping_cache
from config_store import ConfigStore


class MappingCacheTestCase(unittest.TestCase):
    def test_refresh_mapping_cache_updates_on_change(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "config.json")
            store = ConfigStore(path=path)
            store.load()

            device_id = "AA:BB:CC:DD:EE:FF"
            store.set_mapping(device_id, "keyboard", "1", {"keycode": "HID_KEY_A"})
            store.save()

            refresh = refresh_mapping_cache(store, None)
            self.assertIsNotNone(refresh)
            _, cache, mtime = refresh
            self.assertEqual(cache[device_id][0], const.HID_KEY_A)

            time.sleep(1.05)
            store.set_mapping(device_id, "keyboard", "1", {"keycode": "HID_KEY_B"})
            store.save()

            refresh = refresh_mapping_cache(store, mtime)
            self.assertIsNotNone(refresh)
            _, cache, mtime = refresh
            self.assertEqual(cache[device_id][0], const.HID_KEY_B)

            refresh = refresh_mapping_cache(store, mtime)
            self.assertIsNone(refresh)


if __name__ == "__main__":
    unittest.main()
