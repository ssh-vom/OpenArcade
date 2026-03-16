from __future__ import annotations

import json
import os
import socket
from typing import Any, Mapping


OPENARCADE_RUNTIME_SOCKET_PATH_ENV_VAR = "OPENARCADE_RUNTIME_SOCKET_PATH"
DEFAULT_RUNTIME_SOCKET_PATH = "/tmp/openarcade-runtime.sock"

MESSAGE_TYPE_CONFIG_UPDATED = "config_updated"
MESSAGE_TYPE_GET_CONNECTED_DEVICES = "get_connected_devices"
MESSAGE_TYPE_GET_DEVICE_STATES = "get_device_states"


def resolve_runtime_socket_path() -> str:
    return os.environ.get(
        OPENARCADE_RUNTIME_SOCKET_PATH_ENV_VAR, DEFAULT_RUNTIME_SOCKET_PATH
    )


def send_runtime_message(
    message: Mapping[str, Any],
    socket_path: str | None = None,
    timeout: float = 1.0,
) -> dict[str, Any] | None:
    payload = (json.dumps(dict(message), separators=(",", ":")) + "\n").encode("utf-8")
    path = socket_path or resolve_runtime_socket_path()

    try:
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as client:
            client.settimeout(timeout)
            client.connect(path)
            client.sendall(payload)
            response = _read_line(client)
    except OSError:
        return None

    if response is None:
        return None

    try:
        return json.loads(response.decode("utf-8"))
    except json.JSONDecodeError:
        return None


def notify_runtime_config_updated(socket_path: str | None = None) -> bool:
    response = send_runtime_message(
        {"type": MESSAGE_TYPE_CONFIG_UPDATED},
        socket_path=socket_path,
    )
    return bool(response and response.get("ok") is True)


def get_connected_devices(socket_path: str | None = None) -> set[str]:
    response = send_runtime_message(
        {"type": MESSAGE_TYPE_GET_CONNECTED_DEVICES},
        socket_path=socket_path,
    )
    if not response or response.get("ok") is not True:
        return set()

    devices = response.get("devices")
    if not isinstance(devices, list):
        return set()

    return {device_id for device_id in devices if isinstance(device_id, str)}


def get_device_states(
    device_id: str | None = None,
    socket_path: str | None = None,
) -> dict[str, dict[str, Any]]:
    message: dict[str, Any] = {"type": MESSAGE_TYPE_GET_DEVICE_STATES}
    if device_id:
        message["device_id"] = device_id

    response = send_runtime_message(
        message,
        socket_path=socket_path,
    )
    if not response or response.get("ok") is not True:
        return {}

    device_states = response.get("device_states")
    if not isinstance(device_states, dict):
        return {}

    normalized: dict[str, dict[str, Any]] = {}
    for current_device_id, state in device_states.items():
        if not isinstance(current_device_id, str) or not isinstance(state, Mapping):
            continue
        normalized[current_device_id] = dict(state)

    return normalized


def _read_line(client: socket.socket) -> bytes | None:
    chunks: list[bytes] = []
    while True:
        chunk = client.recv(4096)
        if not chunk:
            break
        if b"\n" in chunk:
            before_newline, _separator, _remainder = chunk.partition(b"\n")
            chunks.append(before_newline)
            break
        chunks.append(chunk)

    if not chunks:
        return None

    return b"".join(chunks)
