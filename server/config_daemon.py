import argparse
import json
import os
import sys
from typing import Any

from config_store import ConfigStore


def read_line(fd: int) -> str | None:
    buf = bytearray()
    while True:
        chunk = os.read(fd, 1)
        if not chunk:
            return None
        if chunk == b"\n":
            break
        buf.extend(chunk)
    return buf.decode("utf-8", errors="ignore").strip()


def write_line(fd: int, payload: dict[str, Any]) -> None:
    data = json.dumps(payload, separators=(",", ":")) + "\n"
    os.write(fd, data.encode("utf-8"))


def _handle_ping(store: ConfigStore, message: dict[str, Any]) -> dict[str, Any]:
    return {"ok": True, "reply": "pong"}


def _handle_list_devices(store: ConfigStore, message: dict[str, Any]) -> dict[str, Any]:
    data = store.get_all()
    return {"ok": True, "devices": data.get("devices", {})}


def _handle_get_device(store: ConfigStore, message: dict[str, Any]) -> dict[str, Any]:
    device_id = message.get("device_id")
    if not device_id:
        return {"ok": False, "error": "missing_device_id"}
    device = store.get_device(device_id)
    return {"ok": True, "device": device}


def _handle_set_descriptor(store: ConfigStore, message: dict[str, Any]) -> dict[str, Any]:
    device_id = message.get("device_id")
    descriptor = message.get("descriptor")
    if not device_id or descriptor is None:
        return {"ok": False, "error": "missing_fields"}
    store.set_descriptor(device_id, descriptor)
    store.save()
    return {"ok": True}


def _handle_set_mapping(store: ConfigStore, message: dict[str, Any]) -> dict[str, Any]:
    device_id = message.get("device_id")
    mode = message.get("mode")
    control_id = message.get("control_id")
    mapping = message.get("mapping")
    if not device_id or not mode or control_id is None or mapping is None:
        return {"ok": False, "error": "missing_fields"}
    store.set_mapping(device_id, mode, str(control_id), mapping)
    store.save()
    return {"ok": True}


def _handle_set_active_mode(store: ConfigStore, message: dict[str, Any]) -> dict[str, Any]:
    device_id = message.get("device_id")
    mode = message.get("mode")
    if not device_id or not mode:
        return {"ok": False, "error": "missing_fields"}
    store.set_active_mode(device_id, mode)
    store.save()
    return {"ok": True}


def _handle_set_last_seen(store: ConfigStore, message: dict[str, Any]) -> dict[str, Any]:
    device_id = message.get("device_id")
    if not device_id:
        return {"ok": False, "error": "missing_device_id"}
    store.set_last_seen(device_id)
    store.save()
    return {"ok": True}


COMMAND_HANDLERS = {
    "ping": _handle_ping,
    "list_devices": _handle_list_devices,
    "get_device": _handle_get_device,
    "set_descriptor": _handle_set_descriptor,
    "set_mapping": _handle_set_mapping,
    "set_active_mode": _handle_set_active_mode,
    "set_last_seen": _handle_set_last_seen,
}


def handle_command(store: ConfigStore, message: dict[str, Any]) -> dict[str, Any]:
    cmd = message.get("cmd")
    if not cmd:
        return {"ok": False, "error": "missing_cmd"}

    handler = COMMAND_HANDLERS.get(cmd)
    if not handler:
        return {"ok": False, "error": "unknown_cmd"}

    return handler(store, message)


def run(device_path: str, verbose: bool = False) -> int:
    store = ConfigStore()
    store.load()

    try:
        fd = os.open(device_path, os.O_RDWR | os.O_NOCTTY)
    except OSError as exc:
        print(f"Failed to open {device_path}: {exc}", file=sys.stderr)
        return 1

    try:
        while True:
            line = read_line(fd)
            if line is None:
                if verbose:
                    print("Serial connection closed")
                break
            if not line:
                continue
            try:
                message = json.loads(line)
            except json.JSONDecodeError:
                if verbose:
                    print("Invalid JSON received")
                write_line(fd, {"ok": False, "error": "invalid_json"})
                continue
            store.load()
            if verbose:
                print(f"Received: {message}")
            response = handle_command(store, message)
            if verbose:
                print(f"Responding: {response}")
            write_line(fd, response)
    except KeyboardInterrupt:
        return 0
    finally:
        os.close(fd)

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="OpenArcade config daemon (WebSerial)")
    parser.add_argument(
        "--device", default="/dev/ttyGS0", help="Serial gadget device path"
    )
    parser.add_argument(
        "--verbose", action="store_true", help="Enable request logging"
    )
    args = parser.parse_args()
    return run(args.device, args.verbose)


if __name__ == "__main__":
    raise SystemExit(main())
