import os
import subprocess
import tempfile
import unittest

from hotspot_manager import HotspotConfig, HotspotManager


class _FakeProcess:
    def __init__(self, command, events):
        self.command = command
        self._events = events
        self._returncode = None

    def poll(self):
        return self._returncode

    def terminate(self):
        self._events.append(("terminate", self.command[0]))
        self._returncode = 0

    def wait(self, timeout=None):
        del timeout
        if self._returncode is None:
            self._returncode = 0
        return self._returncode

    def kill(self):
        self._events.append(("kill", self.command[0]))
        self._returncode = -9


class HotspotManagerTestCase(unittest.TestCase):
    def test_start_and_stop_render_templates_and_manage_processes(self):
        commands = []
        process_events = []
        processes = []

        def fake_runner(command, check):
            commands.append((command, check))
            return subprocess.CompletedProcess(command, 0, "", "")

        def fake_popen(command, **kwargs):
            del kwargs
            process = _FakeProcess(command, process_events)
            processes.append(process)
            return process

        with tempfile.TemporaryDirectory() as tmpdir:
            hostapd_template = os.path.join(tmpdir, "hostapd.template")
            dnsmasq_template = os.path.join(tmpdir, "dnsmasq.template")
            runtime_dir = os.path.join(tmpdir, "runtime")

            with open(hostapd_template, "w", encoding="utf-8") as handle:
                handle.write("interface={{INTERFACE}}\nssid={{SSID}}\nwpa_passphrase={{PSK}}\n")
            with open(dnsmasq_template, "w", encoding="utf-8") as handle:
                handle.write("interface={{INTERFACE}}\ndhcp-range={{DHCP_START}},{{DHCP_END}},12h\n")

            config = HotspotConfig(
                interface="wlan0",
                ssid="OpenArcade-Test",
                psk="testpass123",
                ap_addr="192.168.4.1/24",
                runtime_dir=runtime_dir,
                hostapd_template_path=hostapd_template,
                dnsmasq_template_path=dnsmasq_template,
            )

            manager = HotspotManager(
                config=config,
                command_runner=fake_runner,
                popen_factory=fake_popen,
            )

            manager.start()
            self.assertTrue(manager.is_running)
            self.assertEqual(len(processes), 2)

            generated_hostapd = os.path.join(runtime_dir, "hostapd.generated.conf")
            generated_dnsmasq = os.path.join(runtime_dir, "dnsmasq.generated.conf")

            with open(generated_hostapd, "r", encoding="utf-8") as handle:
                hostapd_content = handle.read()
            with open(generated_dnsmasq, "r", encoding="utf-8") as handle:
                dnsmasq_content = handle.read()

            self.assertIn("interface=wlan0", hostapd_content)
            self.assertIn("ssid=OpenArcade-Test", hostapd_content)
            self.assertIn("wpa_passphrase=testpass123", hostapd_content)
            self.assertIn("dhcp-range=192.168.4.50,192.168.4.150,12h", dnsmasq_content)

            self.assertTrue(
                any(
                    command[:4] == ["ip", "addr", "add", "192.168.4.1/24"]
                    for command, _check in commands
                )
            )

            manager.stop()
            self.assertFalse(manager.is_running)

            terminated_binaries = [entry[1] for entry in process_events if entry[0] == "terminate"]
            self.assertEqual(len(terminated_binaries), 2)
            self.assertTrue(terminated_binaries[0].endswith("dnsmasq"))
            self.assertTrue(terminated_binaries[1].endswith("hostapd"))

    def test_invalid_psk_raises(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            hostapd_template = os.path.join(tmpdir, "hostapd.template")
            dnsmasq_template = os.path.join(tmpdir, "dnsmasq.template")
            with open(hostapd_template, "w", encoding="utf-8") as handle:
                handle.write("interface={{INTERFACE}}\n")
            with open(dnsmasq_template, "w", encoding="utf-8") as handle:
                handle.write("interface={{INTERFACE}}\n")

            config = HotspotConfig(
                interface="wlan0",
                ssid="OpenArcade-Test",
                psk="short",
                ap_addr="192.168.4.1/24",
                runtime_dir=os.path.join(tmpdir, "runtime"),
                hostapd_template_path=hostapd_template,
                dnsmasq_template_path=dnsmasq_template,
            )

            manager = HotspotManager(config=config)
            with self.assertRaises(ValueError):
                manager.start()


if __name__ == "__main__":
    unittest.main()
