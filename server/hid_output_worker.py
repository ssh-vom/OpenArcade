from __future__ import annotations

import logging
import queue
import sys
import time
from multiprocessing.queues import Queue
from multiprocessing.synchronize import Event


logger = logging.getLogger("OpenArcade")


def hid_output_worker_process(
    report_queue: Queue,
    stop_event: Event,
) -> None:
    logger.info("HID output worker started")

    hid_device_path = "/dev/hidg0"
    use_mock = False
    hid_device = None

    try:
        hid_device = open(hid_device_path, "wb", buffering=0)
        logger.info("Using HID interface %s", hid_device_path)
    except (FileNotFoundError, PermissionError, OSError):
        use_mock = True
        logger.warning(
            "HID interface %s unavailable, using mock output", hid_device_path
        )

    while not stop_event.is_set():
        try:
            report = report_queue.get(timeout=1.0)
        except queue.Empty:
            continue
        except Exception as exc:
            logger.error("HID output worker queue error: %s", exc)
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
            logger.error("HID output worker write error: %s", exc)
            time.sleep(1.0)

    if hid_device is not None:
        try:
            hid_device.close()
        except OSError:
            pass

    logger.info("HID output worker exiting")
