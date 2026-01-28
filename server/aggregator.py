import asyncio
import logging
import multiprocessing
import os
import struct

from bleak import BleakClient

import constants as const
from config_store import ConfigStore
from constants import CHAR_UUID, DEFAULT_MAPPING
from default_descriptor import default_descriptor

logger = logging.getLogger("OpenArcade")

KEYCODES = {
    name: value for name, value in vars(const).items() if name.startswith("HID_KEY_")
}
MODIFIER_KEYCODES = {
    const.HID_KEY_LEFT_CONTROL: 0x01,
    const.HID_KEY_LEFT_SHIFT: 0x02,
    const.HID_KEY_LEFT_ALT: 0x04,
    const.HID_KEY_LEFT_GUI: 0x08,
    const.HID_KEY_RIGHT_CONTROL: 0x10,
    const.HID_KEY_RIGHT_SHIFT: 0x20,
    const.HID_KEY_RIGHT_ALT: 0x40,
    const.HID_KEY_RIGHT_GUI: 0x80,
}
DEFAULT_CONTROLS = [control.to_dict() for control in default_descriptor().controls]


def resolve_keycode(entry: any) -> int | None:
    if entry is None:
        return None
    if isinstance(entry, int):
        return entry
    if isinstance(entry, dict):
        entry = entry.get("keycode")
    if isinstance(entry, str):
        if entry in KEYCODES:
            return KEYCODES[entry]
        if entry.startswith("0x"):
            try:
                return int(entry, 16)
            except ValueError:
                return None
        if entry.isdigit():
            return int(entry)
    return None


def build_mapping(device_cfg, default_controls=None):
    active_mode = device_cfg.get("active_mode") or "keyboard"
    descriptor = device_cfg.get("descriptor") or {}
    controls = descriptor.get("controls") or (default_controls or DEFAULT_CONTROLS)
    mapping_cfg = device_cfg.get("modes", {}).get(active_mode, {}).get("mapping", {})

    mapping = {}
    for control in controls:
        bit_index = control.get("bit_index")
        if bit_index is None:
            continue
        control_id = control.get("id")
        mapping_entry = None
        if control_id is not None:
            mapping_entry = mapping_cfg.get(
                str(control_id), mapping_cfg.get(control_id)
            )
        keycode = resolve_keycode(mapping_entry)
        if keycode is None:
            keycode = DEFAULT_MAPPING.get(bit_index)
        if keycode is not None:
            mapping[bit_index] = keycode

    for bit_index, keycode in DEFAULT_MAPPING.items():
        mapping.setdefault(bit_index, keycode)

    return mapping


def build_mapping_cache(config_snapshot, default_controls=None):
    controls = default_controls or DEFAULT_CONTROLS
    return {
        device_id: build_mapping(device_cfg, controls)
        for device_id, device_cfg in config_snapshot.get("devices", {}).items()
    }


def refresh_mapping_cache(config_store, previous_mtime, default_controls=None):
    try:
        mtime = os.path.getmtime(config_store.path)
    except OSError:
        mtime = None
    if mtime == previous_mtime:
        return None
    snapshot = config_store.load()
    cache = build_mapping_cache(snapshot, default_controls)
    return snapshot, cache, mtime


def aggregator_process(
    found_queue: multiprocessing.Queue,
    hid_queue: multiprocessing.Queue,
    stop_event: multiprocessing.Event,
):
    """
    Manages connections, maintains device state, maps inputs, and aggregates HID reports.
    """
    logger.info(msg="Aggregator Process Started")

    # State tracking
    connected_clients: dict[str, BleakClient] = {}
    device_states: dict[str, int] = {}  # Address -> 32-bit State

    config_store = ConfigStore()
    config_mtime = None
    mapping_cache = build_mapping_cache(config_store.load())

    async def update_hid_report():
        """
        Combines states from all devices, applies mapping, and sends HID report.
        """
        active_keys: set[Any] = set()

        # 1. Aggregate and Map
        for addr, state in device_states.items():
            mapping = mapping_cache.get(addr, DEFAULT_MAPPING)

            for bit_index, key_code in mapping.items():
                if (state >> bit_index) & 1:
                    active_keys.add(key_code)

        # 2. Construct HID Report (Boot Keyboard: 8 bytes)
        # Byte 0: Modifiers
        # Byte 1: Reserved (0)
        # Byte 2-7: Keycodes (Up to 6 keys)
        report = bytearray(8)

        modifiers = 0
        non_modifier_keys = []
        for key_code in active_keys:
            modifier_bit = MODIFIER_KEYCODES.get(key_code)
            if modifier_bit is not None:
                modifiers |= modifier_bit
            else:
                non_modifier_keys.append(key_code)

        report[0] = modifiers

        # Sort keys for consistency
        sorted_keys = sorted(non_modifier_keys)

        # Populate report (limit to 6 keys for boot protocol compatibility)
        for i in range(min(len(sorted_keys), 6)):
            report[2 + i] = sorted_keys[i]

        # 3. Send to Writer
        hid_queue.put(report)

    def make_notification_handler(address):
        def handler(sender, data):
            if len(data) >= 4:
                # Unpack 32-bit integer (Little Endian)
                state = struct.unpack("<I", data[:4])[0]

                # Check for change before updating?
                # HID usually tolerates repeated reports, but we can optimize.
                if device_states.get(address) != state:
                    device_states[address] = state
                    # Schedule HID update
                    # Since we are in a callback, we should be careful about async context.
                    # But update_hid_report is pure logic + queue.put (thread-safe).
                    # We can call it directly.
                    # Note: Queue.put is blocking if full, but unlimited size by default.

                    # We can't await here easily if update_hid_report was async.
                    # But it doesn't need to be async.
                    # Let's make update_hid_report synchronous (remove async).
                    asyncio.create_task(do_update())

        async def do_update():
            await update_hid_report()

        return handler

    async def connect_device(address):
        if address in connected_clients:
            return

        logger.info(f"Connecting to {address}...")

        def on_disconnect(c):
            logger.warning(f"Disconnected: {c.address}")
            connected_clients.pop(c.address, None)
            device_states.pop(c.address, None)
            config_store.set_connected(c.address, False)
            config_store.save()
            # Update HID to clear stuck keys
            asyncio.create_task(update_hid_report())

        client = BleakClient(address, disconnected_callback=on_disconnect, timeout=10.0)

        try:
            await client.connect()
            connected_clients[address] = client
            logger.info(f"Connected: {address}")

            config_store.set_connected(address, True)
            config_store.save()

            await client.start_notify(CHAR_UUID, make_notification_handler(address))

            # Init state
            device_states[address] = 0

        except Exception as e:
            logger.error(f"Failed to connect to {address}: {e}")
            # Ensure cleanup
            connected_clients.pop(address, None)

    async def run():
        nonlocal mapping_cache, config_mtime
        refresh = refresh_mapping_cache(config_store, config_mtime)
        if refresh:
            _, mapping_cache, config_mtime = refresh
        while not stop_event.is_set():
            # Process new devices
            while not found_queue.empty():
                try:
                    address = found_queue.get_nowait()
                    if address not in connected_clients:
                        asyncio.create_task(coro=connect_device(address))
                except Exception:
                    break

            refresh = refresh_mapping_cache(config_store, config_mtime)
            if refresh:
                _, mapping_cache, config_mtime = refresh
            # Keep loop alive
            await asyncio.sleep(0.5)

        # Cleanup on exit
        logger.info(msg="Aggregator stopping, disconnecting all...")
        for client in connected_clients.values():
            await client.disconnect()

    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass
    except Exception:
        logger.error(msg="Aggregator crashed: {e}")
    finally:
        logger.info(msg="Aggregator Process Exiting")
