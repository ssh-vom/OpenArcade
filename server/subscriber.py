import logging
import multiprocessing
import struct
import sys
import time
import queue
import asyncio

from bleak import BleakClient, BleakScanner

# ==========================================
# CONSTANTS & CONFIGURATION
# ==========================================

# UUIDs (from firmware/esp32/main/src/gatt_svc.c)
# Service: 666f7065-6e61-7263-6164-650000000001
# Characteristic: 666f7065-6e61-7263-6164-650000000002
SERVICE_UUID = "666f7065-6e61-7263-6164-650000000001"
CHAR_UUID = "666f7065-6e61-7263-6164-650000000002"

# HID Keycodes (USB HID Usage Tables)
HID_KEY_A = 0x04
HID_KEY_B = 0x05
HID_KEY_C = 0x06
HID_KEY_D = 0x07
HID_KEY_E = 0x08
HID_KEY_F = 0x09
HID_KEY_G = 0x0A
HID_KEY_H = 0x0B
HID_KEY_I = 0x0C
HID_KEY_J = 0x0D
HID_KEY_K = 0x0E
HID_KEY_L = 0x0F
HID_KEY_M = 0x10
HID_KEY_N = 0x11
HID_KEY_O = 0x12
HID_KEY_P = 0x13
HID_KEY_Q = 0x14
HID_KEY_R = 0x15
HID_KEY_S = 0x16
HID_KEY_T = 0x17
HID_KEY_U = 0x18
HID_KEY_V = 0x19
HID_KEY_W = 0x1A
HID_KEY_X = 0x1B
HID_KEY_Y = 0x1C
HID_KEY_Z = 0x1D
HID_KEY_1 = 0x1E
HID_KEY_2 = 0x1F
HID_KEY_3 = 0x20
HID_KEY_4 = 0x21
HID_KEY_LEFT = 0x50
HID_KEY_RIGHT = 0x4F
HID_KEY_UP = 0x52
HID_KEY_DOWN = 0x51
HID_KEY_ENTER = 0x28
HID_KEY_SPACE = 0x2C

# Default Mapping: Input Bit Index -> HID Keycode
# See controller_input.h for bit definitions
# 0-7: Buttons 1-8
# 8-11: Joy L, R, U, D
# 12: Select, 13: Start, 14: Pair
DEFAULT_MAPPING = {
    0: HID_KEY_B,  # Button 1
    1: HID_KEY_B,  # Button 2
    2: HID_KEY_C,  # Button 3
    3: HID_KEY_D,  # Button 4
    4: HID_KEY_E,  # Button 5
    5: HID_KEY_F,  # Button 6
    6: HID_KEY_G,  # Button 7
    7: HID_KEY_H,  # Button 8
    8: HID_KEY_LEFT,  # Joy L
    9: HID_KEY_RIGHT,  # Joy R
    10: HID_KEY_UP,  # Joy U
    11: HID_KEY_DOWN,  # Joy D
    12: HID_KEY_SPACE,  # Select
    13: HID_KEY_ENTER,  # Start
}

# Logging Setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(processName)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("OpenArcade")

# ==========================================
# PROCESS: SCANNER
# ==========================================


def scanner_process(
    found_queue: multiprocessing.Queue, stop_event: multiprocessing.Event
):
    """
    Continuously scans for devices advertising the OpenArcade Service UUID.
    """
    logger.info("Scanner Process Started")

    async def run():
        scanner = BleakScanner()
        # Keep track of recently seen to avoid spamming the queue
        seen_devices = set()

        while not stop_event.is_set():
            try:
                # Active scan for 2 seconds
                # NOTE: Firmware currently does not advertise Service UUID, so we can't filter by it.
                # We scan for everything and filter by name or known address in logic.
                devices = await scanner.discover(timeout=2.0)

                logger.info(f"Scan complete. Found {len(devices)} devices.")

                for d in devices:
                    # Filter by Device Name (matches firmware default)
                    # Or allow all for debugging if name is unknown
                    if d.name == "NimBLE_GATT" and d.address not in seen_devices:
                        logger.info(f"Discovered Target Device: {d.address} ({d.name})")
                        seen_devices.add(d.address)
                        found_queue.put(d.address)
                    elif d.address not in seen_devices:
                        # Debug log for other devices to help user identify their device
                        logger.debug(f"Ignored Device: {d.address} ({d.name})")

                # Clear seen list to allow re-discovery (simple robustness)
                seen_devices.clear()

            except Exception as e:
                logger.error(f"Scan Error: {e}")
                await asyncio.sleep(1.0)

            # Small delay between scans
            await asyncio.sleep(0.5)

    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass
    finally:
        logger.info("Scanner Process Exiting")


# ==========================================
# PROCESS: AGGREGATOR (MAPPER)
# ==========================================


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


# ==========================================
# PROCESS: HID WRITER
# ==========================================


def hid_writer_process(
    hid_queue: multiprocessing.Queue, stop_event: multiprocessing.Event
):
    """
    Writes aggregated reports to the USB HID Gadget interface.
    """
    logger.info("HID Writer Process Started")

    # Configuration
    HID_DEV_PATH = "/dev/hidg0"
    USE_MOCK = True  # Default to mock if file doesn't exist

    # Check if device exists
    try:
        # Just check existence
        with open(HID_DEV_PATH, "rb"):
            pass
        USE_MOCK = False
        logger.info(f"Using actual HID interface: {HID_DEV_PATH}")
    except (FileNotFoundError, PermissionError):
        logger.warning(
            f"HID interface {HID_DEV_PATH} not found/accessible. Using MOCK mode (stdout)."
        )
        USE_MOCK = True

    while not stop_event.is_set():
        try:
            report = hid_queue.get(
                timeout=1.0
            )  # Blocking with timeout to check stop_event

            if USE_MOCK:
                # Visual Mock
                # hex_str = " ".join(f"{b:02X}" for b in report)
                # Parse keys for better visualization
                keys = []
                for k in report[2:]:
                    if k != 0:
                        keys.append(f"0x{k:02X}")

                output = f"\r[HID REPORT] Bytes: {report.hex()} | Keys: {keys}   "
                sys.stdout.write(output)
                sys.stdout.flush()
            else:
                with open(HID_DEV_PATH, "wb") as f:
                    f.write(report)

        except queue.Empty:
            continue
        except Exception as e:
            logger.error(f"HID Write Error: {e}")
            time.sleep(1.0)

    logger.info("HID Writer Process Exiting")


# ==========================================
# MAIN ENTRY POINT
# ==========================================


def main():
    logger.info("Initializing OpenArcade Subscriber...")

    # Communication Queues
    found_queue = multiprocessing.Queue()
    hid_queue = multiprocessing.Queue()

    # Control Event
    stop_event = multiprocessing.Event()

    # Create Processes
    p_scanner = multiprocessing.Process(
        target=scanner_process, args=(found_queue, stop_event), name="Scanner"
    )
    p_aggregator = multiprocessing.Process(
        target=aggregator_process,
        args=(found_queue, hid_queue, stop_event),
        name="Aggregator",
    )
    p_writer = multiprocessing.Process(
        target=hid_writer_process, args=(hid_queue, stop_event), name="HIDWriter"
    )

    processes = [p_scanner, p_aggregator, p_writer]

    # Start
    for p in processes:
        p.start()

    logger.info("All processes started. Press Ctrl+C to exit.")

    # Wait for interrupt
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("\nShutdown signal received...")
        stop_event.set()

    # Cleanup
    for p in processes:
        p.join(timeout=5.0)
        if p.is_alive():
            logger.warning(f"Process {p.name} did not exit cleanly, terminating...")
            p.terminate()

    logger.info("System Shutdown Complete.")


if __name__ == "__main__":
    main()
