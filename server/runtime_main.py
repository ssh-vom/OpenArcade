from __future__ import annotations

import argparse
import logging
import multiprocessing
import signal
import time

from aggregator import aggregator_process
from hid_writer import hid_writer_process


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(processName)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("OpenArcade")


def main() -> int:
    parser = argparse.ArgumentParser(description="OpenArcade BLE/HID subscriber")
    parser.add_argument(
        "--config",
        help="Path to the persistent config store JSON file",
    )
    args = parser.parse_args()

    logger.info("Initializing OpenArcade Subscriber...")

    hid_queue = multiprocessing.Queue()
    stop_event = multiprocessing.Event()
    shutdown_requested = False

    def request_shutdown(_signum, _frame) -> None:
        nonlocal shutdown_requested
        shutdown_requested = True
        stop_event.set()

    for signum in (signal.SIGINT, signal.SIGTERM):
        signal.signal(signum, request_shutdown)

    aggregator = multiprocessing.Process(
        target=aggregator_process,
        args=(hid_queue, stop_event, args.config),
        name="Aggregator",
    )
    writer = multiprocessing.Process(
        target=hid_writer_process,
        args=(hid_queue, stop_event),
        name="HIDWriter",
    )

    processes = [aggregator, writer]

    for process in processes:
        process.start()

    logger.info("All processes started")

    return_code = 0

    try:
        while not shutdown_requested:
            for process in processes:
                if process.is_alive():
                    continue
                logger.error("Process %s exited unexpectedly with code %s", process.name, process.exitcode)
                shutdown_requested = True
                stop_event.set()
                return_code = 1
                break
            time.sleep(1.0)
    except KeyboardInterrupt:
        logger.info("Shutdown signal received")
        stop_event.set()
    finally:
        stop_event.set()
        for process in processes:
            process.join(timeout=5.0)
            if process.is_alive():
                logger.warning("Process %s did not exit cleanly, terminating...", process.name)
                process.terminate()
        hid_queue.close()
        hid_queue.join_thread()

    logger.info("System Shutdown Complete.")
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
