import asyncio
import logging
import multiprocessing
import struct

from bleak import BleakClient

from constants import CHAR_UUID, DEFAULT_MAPPING

logger = logging.getLogger("OpenArcade")


def aggregator_process(
    found_queue: multiprocessing.Queue,
    hid_queue: multiprocessing.Queue,
    stop_event: multiprocessing.Event,
):
    """
    Manages connections, maintains device state, maps inputs, and aggregates HID reports.
    """
    logger.info("Aggregator Process Started")

    # State tracking
    connected_clients: dict[str, BleakClient] = {}
    device_states: dict[str, int] = {}  # Address -> 32-bit State

    async def update_hid_report():
        """
        Combines states from all devices, applies mapping, and sends HID report.
        """
        active_keys = set()

        # 1. Aggregate and Map
        for addr, state in device_states.items():
            # In the future, we can look up specific profiles based on 'addr'
            mapping = DEFAULT_MAPPING

            for bit_index, key_code in mapping.items():
                if (state >> bit_index) & 1:
                    active_keys.add(key_code)

        # 2. Construct HID Report (Boot Keyboard: 8 bytes)
        # Byte 0: Modifiers (0 for now)
        # Byte 1: Reserved (0)
        # Byte 2-7: Keycodes (Up to 6 keys)
        report = bytearray(8)

        # Sort keys for consistency
        sorted_keys = sorted(list(active_keys))

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
            # Update HID to clear stuck keys
            asyncio.create_task(update_hid_report())

        client = BleakClient(address, disconnected_callback=on_disconnect, timeout=10.0)

        try:
            await client.connect()
            connected_clients[address] = client
            logger.info(f"Connected: {address}")

            await client.start_notify(CHAR_UUID, make_notification_handler(address))

            # Init state
            device_states[address] = 0

        except Exception as e:
            logger.error(f"Failed to connect to {address}: {e}")
            # Ensure cleanup
            connected_clients.pop(address, None)

    async def run():
        while not stop_event.is_set():
            # Process new devices
            while not found_queue.empty():
                try:
                    address = found_queue.get_nowait()
                    if address not in connected_clients:
                        asyncio.create_task(connect_device(address))
                except Exception:
                    break

            # Keep loop alive
            await asyncio.sleep(0.5)

        # Cleanup on exit
        logger.info("Aggregator stopping, disconnecting all...")
        for client in connected_clients.values():
            await client.disconnect()

    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass
    except Exception as e:
        logger.error(f"Aggregator crashed: {e}")
    finally:
        logger.info("Aggregator Process Exiting")
