import asyncio
import logging
import multiprocessing
from constants import SCANNER_DELAY

from bleak import BleakScanner

logger = logging.getLogger("OpenArcade")


def scanner_process(
    found_queue,
    stop_event,
):
    """
    Continuously scans for devices advertising the OpenArcade Service UUID.
    """
    logger.info("Scanner Process Started")

    async def run():
        def detection_callback(device, advertisement_data):
            if device.name == "NimBLE_GATT":
                logger.info(
                    f"Discovered Target Device: {device.address} ({device.name})"
                )
                found_queue.put(device.address)

        scanner = BleakScanner(detection_callback=detection_callback)
        try:
            await scanner.start()
            while not stop_event.is_set():
                await asyncio.sleep(1.0)
            await scanner.stop()
        except Exception as e:
            logger.error(f"Scan Error: {e}")

    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass
    finally:
        logger.info("Scanner Process Exiting")
