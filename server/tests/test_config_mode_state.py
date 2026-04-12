import os
import tempfile
import unittest

from config_mode_state import OPENARCADE_CONFIG_MODE_PATH_ENV_VAR, ConfigModeState


class ConfigModeStateTestCase(unittest.TestCase):
    def test_default_state_is_disabled(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "config_mode.json")
            state = ConfigModeState(path=path)

            initialized = state.ensure_initialized()
            self.assertFalse(initialized["enabled"])
            self.assertEqual(initialized["sequence"], 0)
            self.assertTrue(os.path.exists(path))

    def test_toggle_persists_and_increments_sequence(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "config_mode.json")
            state = ConfigModeState(path=path)

            first = state.ensure_initialized()
            self.assertFalse(first["enabled"])

            second = state.toggle(source="test")
            self.assertTrue(second["enabled"])
            self.assertEqual(second["sequence"], 1)

            reloaded = ConfigModeState(path=path)
            loaded = reloaded.load()
            self.assertTrue(loaded["enabled"])
            self.assertEqual(loaded["sequence"], 1)

    def test_default_path_can_be_overridden_via_env(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "state", "config_mode.json")
            original = os.environ.get(OPENARCADE_CONFIG_MODE_PATH_ENV_VAR)
            os.environ[OPENARCADE_CONFIG_MODE_PATH_ENV_VAR] = path

            try:
                state = ConfigModeState()
                self.assertEqual(state.path, path)
                state.ensure_initialized()
                self.assertTrue(os.path.exists(path))
            finally:
                if original is None:
                    os.environ.pop(OPENARCADE_CONFIG_MODE_PATH_ENV_VAR, None)
                else:
                    os.environ[OPENARCADE_CONFIG_MODE_PATH_ENV_VAR] = original


if __name__ == "__main__":
    unittest.main()
