from __future__ import annotations

import argparse
import json
import os
import select
import sys
import time
from typing import Any

from config.commands import handle_command
from config.store import DeviceConfigStore
from core.ipc import notify_runtime_config_updated
from state.gadget import GadgetState


def read_line(fd: int) -> str | None:
    buffer = bytearray()
    while True:
        chunk = os.read(fd, 1)
        if not chunk:
            return None
        if chunk == b"\n":
            break
        buffer.extend(chunk)
    return buffer.decode("utf-8", errors="ignore").strip()


def write_line(fd: int, payload: dict[str, Any]) -> None:
    data = json.dumps(payload, separators=(",", ":")) + "\n"
    os.write(fd, data.encode("utf-8"))


def run(
    device_path: str,
    verbose: bool = False,
    config_path: str | None = None,
) -> int:
    store = DeviceConfigStore(path=config_path)
    store.load()
    gadget_state = GadgetState()

    while True:
        try:
            state = gadget_state.load()
            serial_enabled = state.get("persona") == "pc" and bool(state.get("ready"))
            if not serial_enabled:
                time.sleep(0.25)
                continue

            try:
                fd = os.open(device_path, os.O_RDWR | os.O_NOCTTY)
            except OSError as exc:
                if verbose:
                    print(f"Failed to open {device_path}: {exc}", file=sys.stderr)
                time.sleep(0.5)
                continue

            try:
                while True:
                    state = gadget_state.load()
                    serial_enabled = (
                        state.get("persona") == "pc" and bool(state.get("ready"))
                    )
                    if not serial_enabled:
                        if verbose:
                            print("Serial persona disabled; closing serial device")
                        break

                    readable, _, _ = select.select([fd], [], [], 0.25)
                    if not readable:
                        continue

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

                    response, should_notify_runtime = handle_command(store, message)

                    if verbose:
                        print(f"Responding: {response}")

                    write_line(fd, response)

                    if should_notify_runtime:
                        runtime_notified = notify_runtime_config_updated()
                        if verbose and not runtime_notified:
                            print("Runtime update notification failed")
            finally:
                os.close(fd)

            if verbose:
                print(f"Reopening serial device {device_path}")
        except KeyboardInterrupt:
            return 0

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="OpenArcade USB serial configuration service"
    )
    parser.add_argument(
        "--device", default="/dev/ttyGS0", help="Serial gadget device path"
    )
    parser.add_argument(
        "--config",
        help="Path to the persistent config store JSON file",
    )
    parser.add_argument("--verbose", action="store_true", help="Enable request logging")
    args = parser.parse_args()
    return run(args.device, args.verbose, args.config)


if __name__ == "__main__":
    raise SystemExit(main())
