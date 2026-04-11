import threading
import unittest

from config_mode_orchestrator_service import ConfigModeOrchestrator


class _FakePortalService:
    def __init__(self, events, fail_on_start=False):
        self.events = events
        self.fail_on_start = fail_on_start
        self.is_running = False

    def start(self):
        self.events.append("portal.start")
        if self.fail_on_start:
            raise RuntimeError("portal failed")
        self.is_running = True

    def stop(self, timeout=5.0):
        del timeout
        self.events.append("portal.stop")
        self.is_running = False


class _FakeHotspotManager:
    def __init__(self, events):
        self.events = events
        self.is_running = False

    def start(self):
        self.events.append("hotspot.start")
        self.is_running = True

    def stop(self):
        self.events.append("hotspot.stop")
        self.is_running = False


class _StaticState:
    def ensure_initialized(self):
        return {
            "enabled": False,
            "sequence": 0,
            "source": "test",
        }

    def load(self, use_cache=False):
        del use_cache
        return {
            "enabled": False,
            "sequence": 0,
            "source": "test",
        }


class _SequencedState:
    def __init__(self, states, stop_event):
        self.states = list(states)
        self.stop_event = stop_event
        self.index = 0

    def ensure_initialized(self):
        return dict(self.states[0])

    def load(self, use_cache=False):
        del use_cache
        if self.index < len(self.states):
            state = dict(self.states[self.index])
            self.index += 1
        else:
            state = dict(self.states[-1])

        if self.index >= len(self.states):
            self.stop_event.set()

        return state


class ConfigModeOrchestratorTestCase(unittest.TestCase):
    def test_reconcile_orders_start_and_stop(self):
        events = []
        portal = _FakePortalService(events)
        hotspot = _FakeHotspotManager(events)

        orchestrator = ConfigModeOrchestrator(
            config_mode_state=_StaticState(),
            portal_service=portal,
            hotspot_manager=hotspot,
            poll_interval=0.01,
        )

        orchestrator.reconcile(True)
        self.assertEqual(events[:2], ["hotspot.start", "portal.start"])

        orchestrator.reconcile(False)
        self.assertEqual(events[2:], ["portal.stop", "hotspot.stop"])

    def test_portal_start_failure_rolls_back_hotspot(self):
        events = []
        portal = _FakePortalService(events, fail_on_start=True)
        hotspot = _FakeHotspotManager(events)

        orchestrator = ConfigModeOrchestrator(
            config_mode_state=_StaticState(),
            portal_service=portal,
            hotspot_manager=hotspot,
            poll_interval=0.01,
        )

        with self.assertRaises(RuntimeError):
            orchestrator.reconcile(True)

        self.assertEqual(events, ["hotspot.start", "portal.start", "hotspot.stop"])
        self.assertFalse(hotspot.is_running)

    def test_run_reacts_to_sequence_changes(self):
        events = []
        portal = _FakePortalService(events)
        hotspot = _FakeHotspotManager(events)
        stop_event = threading.Event()

        states = [
            {"enabled": False, "sequence": 0, "source": "test"},
            {"enabled": True, "sequence": 1, "source": "gpio"},
            {"enabled": False, "sequence": 2, "source": "gpio"},
        ]

        orchestrator = ConfigModeOrchestrator(
            config_mode_state=_SequencedState(states, stop_event),
            portal_service=portal,
            hotspot_manager=hotspot,
            poll_interval=0.001,
        )

        rc = orchestrator.run(stop_event=stop_event)
        self.assertEqual(rc, 0)
        self.assertEqual(
            events,
            ["hotspot.start", "portal.start", "portal.stop", "hotspot.stop"],
        )


if __name__ == "__main__":
    unittest.main()
