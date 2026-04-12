from __future__ import annotations

import ipaddress
import logging
import os
import shutil
import subprocess
import threading
import time
from dataclasses import dataclass
from typing import Any, Callable


logger = logging.getLogger("OpenArcade")

OPENARCADE_CONFIG_AP_INTERFACE_ENV_VAR = "OPENARCADE_CONFIG_AP_INTERFACE"
OPENARCADE_CONFIG_AP_SSID_ENV_VAR = "OPENARCADE_CONFIG_AP_SSID"
OPENARCADE_CONFIG_AP_PSK_ENV_VAR = "OPENARCADE_CONFIG_AP_PSK"
OPENARCADE_CONFIG_AP_ADDR_ENV_VAR = "OPENARCADE_CONFIG_AP_ADDR"
OPENARCADE_CONFIG_AP_RUNTIME_DIR_ENV_VAR = "OPENARCADE_CONFIG_AP_RUNTIME_DIR"
OPENARCADE_CONFIG_AP_HOSTAPD_TEMPLATE_ENV_VAR = "OPENARCADE_CONFIG_AP_HOSTAPD_TEMPLATE"
OPENARCADE_CONFIG_AP_DNSMASQ_TEMPLATE_ENV_VAR = "OPENARCADE_CONFIG_AP_DNSMASQ_TEMPLATE"

DEFAULT_CONFIG_AP_INTERFACE = "wlan0"
DEFAULT_CONFIG_AP_SSID = "OpenArcade-Config"
DEFAULT_CONFIG_AP_PSK = "openarcade"
DEFAULT_CONFIG_AP_ADDR = "192.168.4.1/24"
DEFAULT_CONFIG_AP_RUNTIME_DIR = "/run/openarcade/hotspot"
DEFAULT_HOSTAPD_TEMPLATE = "/opt/openarcade/app/packaging/rpi/hotspot/hostapd.conf.template"
DEFAULT_DNSMASQ_TEMPLATE = "/opt/openarcade/app/packaging/rpi/hotspot/dnsmasq.conf.template"


def resolve_hotspot_interface() -> str:
    return (os.environ.get(OPENARCADE_CONFIG_AP_INTERFACE_ENV_VAR) or DEFAULT_CONFIG_AP_INTERFACE).strip()


def resolve_hotspot_ssid() -> str:
    return (os.environ.get(OPENARCADE_CONFIG_AP_SSID_ENV_VAR) or DEFAULT_CONFIG_AP_SSID).strip()


def resolve_hotspot_psk() -> str:
    return (os.environ.get(OPENARCADE_CONFIG_AP_PSK_ENV_VAR) or DEFAULT_CONFIG_AP_PSK).strip()


def resolve_hotspot_ap_addr() -> str:
    return (os.environ.get(OPENARCADE_CONFIG_AP_ADDR_ENV_VAR) or DEFAULT_CONFIG_AP_ADDR).strip()


def resolve_hotspot_runtime_dir() -> str:
    return (
        os.environ.get(OPENARCADE_CONFIG_AP_RUNTIME_DIR_ENV_VAR)
        or DEFAULT_CONFIG_AP_RUNTIME_DIR
    ).strip()


def _resolve_template_path(env_var: str, deployed_default: str, file_name: str) -> str:
    from_env = os.environ.get(env_var)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_fallback = os.path.abspath(
        os.path.join(script_dir, "..", "packaging", "rpi", "hotspot", file_name)
    )

    for candidate in (from_env, deployed_default, repo_fallback):
        if candidate and os.path.isfile(candidate):
            return candidate

    return from_env or deployed_default


def resolve_hostapd_template_path() -> str:
    return _resolve_template_path(
        OPENARCADE_CONFIG_AP_HOSTAPD_TEMPLATE_ENV_VAR,
        DEFAULT_HOSTAPD_TEMPLATE,
        "hostapd.conf.template",
    )


def resolve_dnsmasq_template_path() -> str:
    return _resolve_template_path(
        OPENARCADE_CONFIG_AP_DNSMASQ_TEMPLATE_ENV_VAR,
        DEFAULT_DNSMASQ_TEMPLATE,
        "dnsmasq.conf.template",
    )


def parse_ap_ip(ap_addr: str) -> str | None:
    try:
        parsed = ipaddress.ip_interface(ap_addr)
    except ValueError:
        return None

    if parsed.version != 4:
        return None

    return str(parsed.ip)


@dataclass(frozen=True)
class HotspotConfig:
    interface: str
    ssid: str
    psk: str
    ap_addr: str
    runtime_dir: str
    hostapd_template_path: str
    dnsmasq_template_path: str


def resolve_hotspot_config() -> HotspotConfig:
    return HotspotConfig(
        interface=resolve_hotspot_interface(),
        ssid=resolve_hotspot_ssid(),
        psk=resolve_hotspot_psk(),
        ap_addr=resolve_hotspot_ap_addr(),
        runtime_dir=resolve_hotspot_runtime_dir(),
        hostapd_template_path=resolve_hostapd_template_path(),
        dnsmasq_template_path=resolve_dnsmasq_template_path(),
    )


class HotspotManager:
    def __init__(
        self,
        config: HotspotConfig | None = None,
        command_runner: Callable[[list[str], bool], subprocess.CompletedProcess[str]] | None = None,
        popen_factory: Callable[..., subprocess.Popen[Any]] | None = None,
    ) -> None:
        self.config = config or resolve_hotspot_config()

        self._command_runner = command_runner or self._run_command
        self._popen = popen_factory or subprocess.Popen

        self._lock = threading.RLock()
        self._hostapd_process: subprocess.Popen[Any] | None = None
        self._dnsmasq_process: subprocess.Popen[Any] | None = None

        self._hostapd_generated_path = os.path.join(
            self.config.runtime_dir,
            "hostapd.generated.conf",
        )
        self._dnsmasq_generated_path = os.path.join(
            self.config.runtime_dir,
            "dnsmasq.generated.conf",
        )

    @property
    def is_running(self) -> bool:
        with self._lock:
            if self._hostapd_process is None or self._dnsmasq_process is None:
                return False
            return (
                self._hostapd_process.poll() is None
                and self._dnsmasq_process.poll() is None
            )

    def status(self) -> dict[str, Any]:
        ap_ip = parse_ap_ip(self.config.ap_addr)
        return {
            "running": self.is_running,
            "interface": self.config.interface,
            "ssid": self.config.ssid,
            "ap_addr": self.config.ap_addr,
            "ap_ip": ap_ip,
        }

    def start(self) -> None:
        with self._lock:
            if self.is_running:
                return

            self._validate_config()
            self._ensure_runtime_dir()
            context = self._build_template_context()
            self._render_templates(context)

            self._stop_system_services_best_effort()
            self._configure_interface_up()

            hostapd_started = False
            try:
                self._start_hostapd()
                hostapd_started = True
                self._start_dnsmasq()
            except Exception:
                if hostapd_started:
                    self._stop_processes()
                self._configure_interface_down_best_effort()
                raise

            logger.info(
                "Config hotspot started (interface=%s ssid=%s addr=%s)",
                self.config.interface,
                self.config.ssid,
                self.config.ap_addr,
            )

    def stop(self) -> None:
        with self._lock:
            self._stop_processes()
            self._configure_interface_down_best_effort()
            logger.info("Config hotspot stopped")

    def _validate_config(self) -> None:
        if not self.config.interface:
            raise ValueError("Hotspot interface must not be empty")

        if not self.config.ssid or len(self.config.ssid) > 32:
            raise ValueError("Hotspot SSID must be 1-32 characters")

        if len(self.config.psk) < 8 or len(self.config.psk) > 63:
            raise ValueError("Hotspot PSK must be 8-63 characters")

        parsed = ipaddress.ip_interface(self.config.ap_addr)
        if parsed.version != 4:
            raise ValueError("Hotspot AP address must be IPv4 CIDR")

        if not os.path.isfile(self.config.hostapd_template_path):
            raise FileNotFoundError(
                f"hostapd template not found: {self.config.hostapd_template_path}"
            )

        if not os.path.isfile(self.config.dnsmasq_template_path):
            raise FileNotFoundError(
                f"dnsmasq template not found: {self.config.dnsmasq_template_path}"
            )

    def _ensure_runtime_dir(self) -> None:
        os.makedirs(self.config.runtime_dir, exist_ok=True)

    def _build_template_context(self) -> dict[str, str]:
        parsed = ipaddress.ip_interface(self.config.ap_addr)
        network = parsed.network

        start_ip, end_ip = self._derive_dhcp_range(network)
        return {
            "INTERFACE": self.config.interface,
            "SSID": self.config.ssid,
            "PSK": self.config.psk,
            "AP_ADDR": self.config.ap_addr,
            "AP_IP": str(parsed.ip),
            "NETMASK": str(parsed.network.netmask),
            "DHCP_START": start_ip,
            "DHCP_END": end_ip,
        }

    def _derive_dhcp_range(self, network: ipaddress.IPv4Network) -> tuple[str, str]:
        network_int = int(network.network_address)
        broadcast_int = int(network.broadcast_address)

        start_int = min(network_int + 50, max(network_int + 2, broadcast_int - 2))
        end_int = min(network_int + 150, broadcast_int - 1)

        if end_int <= start_int:
            start_int = max(network_int + 2, broadcast_int - 2)
            end_int = max(start_int, broadcast_int - 1)

        return str(ipaddress.IPv4Address(start_int)), str(ipaddress.IPv4Address(end_int))

    def _render_templates(self, context: dict[str, str]) -> None:
        with open(self.config.hostapd_template_path, "r", encoding="utf-8") as handle:
            hostapd_template = handle.read()

        with open(self.config.dnsmasq_template_path, "r", encoding="utf-8") as handle:
            dnsmasq_template = handle.read()

        hostapd_rendered = self._render_template(hostapd_template, context)
        dnsmasq_rendered = self._render_template(dnsmasq_template, context)

        with open(self._hostapd_generated_path, "w", encoding="utf-8") as handle:
            handle.write(hostapd_rendered)

        with open(self._dnsmasq_generated_path, "w", encoding="utf-8") as handle:
            handle.write(dnsmasq_rendered)

    def _render_template(self, template: str, context: dict[str, str]) -> str:
        rendered = template
        for key, value in context.items():
            rendered = rendered.replace(f"{{{{{key}}}}}", value)
        return rendered

    def _stop_system_services_best_effort(self) -> None:
        self._command_runner(["systemctl", "stop", "hostapd"], False)
        self._command_runner(["systemctl", "stop", "dnsmasq"], False)

    def _configure_interface_up(self) -> None:
        iface = self.config.interface
        self._command_runner(["ip", "link", "set", "dev", iface, "down"], False)
        self._command_runner(["ip", "addr", "flush", "dev", iface], False)
        self._command_runner(["ip", "addr", "add", self.config.ap_addr, "dev", iface], True)
        self._command_runner(["ip", "link", "set", "dev", iface, "up"], True)

    def _configure_interface_down_best_effort(self) -> None:
        iface = self.config.interface
        self._command_runner(["ip", "addr", "flush", "dev", iface], False)
        self._command_runner(["ip", "link", "set", "dev", iface, "down"], False)

    def _start_hostapd(self) -> None:
        hostapd_binary = shutil.which("hostapd") or "/usr/sbin/hostapd"
        process = self._popen(
            [hostapd_binary, self._hostapd_generated_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.STDOUT,
            text=True,
        )
        self._hostapd_process = process

        time.sleep(0.3)
        if process.poll() is not None:
            raise RuntimeError("hostapd failed to start")

    def _start_dnsmasq(self) -> None:
        dnsmasq_binary = shutil.which("dnsmasq") or "/usr/sbin/dnsmasq"
        process = self._popen(
            [dnsmasq_binary, "--no-daemon", f"--conf-file={self._dnsmasq_generated_path}"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.STDOUT,
            text=True,
        )
        self._dnsmasq_process = process

        time.sleep(0.3)
        if process.poll() is not None:
            raise RuntimeError("dnsmasq failed to start")

    def _stop_processes(self) -> None:
        dnsmasq = self._dnsmasq_process
        hostapd = self._hostapd_process

        self._dnsmasq_process = None
        self._hostapd_process = None

        self._terminate_process("dnsmasq", dnsmasq)
        self._terminate_process("hostapd", hostapd)

    def _terminate_process(
        self,
        name: str,
        process: subprocess.Popen[Any] | None,
        timeout_seconds: float = 5.0,
    ) -> None:
        if process is None:
            return

        if process.poll() is not None:
            return

        try:
            process.terminate()
            process.wait(timeout=timeout_seconds)
        except subprocess.TimeoutExpired:
            logger.warning("%s did not stop in time; killing", name)
            process.kill()
            process.wait(timeout=2.0)
        except Exception:
            logger.warning("Failed to stop %s cleanly", name, exc_info=True)

    def _run_command(
        self,
        command: list[str],
        check: bool,
    ) -> subprocess.CompletedProcess[str]:
        try:
            return subprocess.run(
                command,
                check=check,
                capture_output=True,
                text=True,
            )
        except FileNotFoundError:
            if not check:
                logger.warning("Command not found (ignored): %s", " ".join(command))
                return subprocess.CompletedProcess(command, 127, "", "command not found")
            raise
        except subprocess.CalledProcessError as exc:
            logger.error(
                "Command failed: %s (exit=%s stdout=%s stderr=%s)",
                " ".join(command),
                exc.returncode,
                (exc.stdout or "").strip(),
                (exc.stderr or "").strip(),
            )
            raise
