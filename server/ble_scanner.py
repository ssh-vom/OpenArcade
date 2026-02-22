import asyncio
import logging
import multiprocessing
import time
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
        last_enqueued: dict[str, float] = {}

        def detection_callback(device, advertisement_data):
            name = device.name or getattr(advertisement_data, "local_name", None)
            if name == "NimBLE_GATT":
                now = time.monotonic()
                last_seen = last_enqueued.get(device.address)
                if last_seen is not None and (now - last_seen) < SCANNER_DELAY:
                    return

                last_enqueued[device.address] = now
                logger.info(
                    f"Discovered Target Device: {device.address} ({name})"
                )
                found_queue.put(device.address)

        scanner = BleakScanner(detection_callback=detection_callback)
        scanner_started = False
        try:
            await scanner.start()
            scanner_started = True
            while not stop_event.is_set():
                await asyncio.sleep(1.0)
        except Exception as e:
            logger.error(f"Scan Error: {e}")
        finally:
            if scanner_started:
                await scanner.stop()

    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass
    finally:
        logger.info("Scanner Process Exiting")
