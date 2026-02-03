import asyncio
import logging
import multiprocessing
from constants import SCANNER_DELAY

from bleak import BleakScanner

logger = logging.getLogger("OpenArcade")


def scanner_process(
    found_queue: multiprocessing.Queue,
    stop_event: multiprocessing.Event,
):
    """
    Continuously scans for devices advertising the OpenArcade Service UUID.
    """
    logger.info("Scanner Process Started")

    async def run():
        scanner = BleakScanner()
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
                    if d.name == "NimBLE_GATT":
                        logger.info(f"Discovered Target Device: {d.address} ({d.name})")
                        found_queue.put(d.address)
                    else:
                        # Debug log for other devices to help user identify their device
                        logger.debug(f"Ignored Device: {d.address} ({d.name})")

            except Exception as e:
                logger.error(f"Scan Error: {e}")
                await asyncio.sleep(SCANNER_DELAY * 0.5)

            # Small delay between scans
            await asyncio.sleep(SCANNER_DELAY)

    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass
    finally:
        logger.info("Scanner Process Exiting")
