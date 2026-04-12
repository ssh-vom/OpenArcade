from __future__ import annotations

import os

from hotspot_manager import parse_ap_ip, resolve_hotspot_ap_addr, resolve_hotspot_ssid


OPENARCADE_CONFIG_PORTAL_PORT_ENV_VAR = "OPENARCADE_CONFIG_PORTAL_PORT"
DEFAULT_CONFIG_PORTAL_PORT = 8080


def _resolve_portal_port() -> int:
    raw = os.environ.get(OPENARCADE_CONFIG_PORTAL_PORT_ENV_VAR)
    if not raw:
        return DEFAULT_CONFIG_PORTAL_PORT

    try:
        port = int(raw)
        if 1 <= port <= 65535:
            return port
    except ValueError:
        pass

    return DEFAULT_CONFIG_PORTAL_PORT


def get_config_network_status() -> dict[str, str | None]:
    ssid = resolve_hotspot_ssid()
    ap_addr = resolve_hotspot_ap_addr()
    ap_ip = parse_ap_ip(ap_addr)
    portal_port = _resolve_portal_port()

    return {
        "ssid": ssid,
        "ap_addr": ap_addr,
        "ap_ip": ap_ip,
        "url": f"http://{ap_ip}:{portal_port}" if ap_ip else None,
    }
