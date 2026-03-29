from __future__ import annotations

import logging
import multiprocessing
import queue
import sys
import time


logger = logging.getLogger("OpenArcade")


def hid_writer_process(
    hid_queue: multiprocessing.Queue,
    stop_event: multiprocessing.Event,
):
    """Writes aggregated reports to the USB HID gadget interface."""

    logger.info("HID Writer Process Started")

    hid_device_path = "/dev/hidg0"
    use_mock = False
    hid_device = None

    try:
        hid_device = open(hid_device_path, "wb", buffering=0)
        logger.info("Using actual HID interface: %s", hid_device_path)
    except (FileNotFoundError, PermissionError, OSError):
        use_mock = True
        logger.warning(
            "HID interface %s not found/accessible. Using MOCK mode (stdout).",
            hid_device_path,
        )

    while not stop_event.is_set():
        try:
            report = hid_queue.get(timeout=1.0)
        except queue.Empty:
            continue
        except Exception as exc:
            logger.error("HID queue error: %s", exc)
            time.sleep(1.0)
            continue

        try:
            if use_mock:
                keys = [f"0x{key:02X}" for key in report[2:] if key != 0]
                output = f"\r[HID REPORT] Bytes: {report.hex()} | Keys: {keys}   "
                sys.stdout.write(output)
                sys.stdout.flush()
            else:
                hid_device.write(report)
        except Exception as exc:
            logger.error("HID write error: %s", exc)
            time.sleep(1.0)

    if hid_device is not None:
        try:
            hid_device.close()
        except OSError:
            pass

    logger.info("HID Writer Process Exiting")
