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
    parser.add_argument(
        "--aggregator-core",
        type=int,
        default=0,
        help="CPU core for aggregator process (default: 0)",
    )
    parser.add_argument(
        "--writer-core",
        type=int,
        default=1,
        help="CPU core for HID writer process (default: 1)",
    )
    args = parser.parse_args()

    logger.info("Initializing OpenArcade Subscriber...")
    logger.info("Aggregator on CPU core %d, HID writer on CPU core %d", 
                args.aggregator_core, args.writer_core)

    # Shared memory mailbox for latest HID report (replaces Queue).
    # Use a 64-byte buffer so Switch-mode gadget transport can share the same mailbox.
    report_array = multiprocessing.Array("B", 64, lock=False)
    report_version = multiprocessing.Value("i", 0, lock=True)  # Version counter
    report_event = multiprocessing.Event()  # Signals new data available
    
    stop_event = multiprocessing.Event()
    shutdown_requested = False

    def request_shutdown(_signum, _frame) -> None:
        nonlocal shutdown_requested
        shutdown_requested = True
        stop_event.set()
        report_event.set()  # Wake up writer so it can exit

    for signum in (signal.SIGINT, signal.SIGTERM):
        signal.signal(signum, request_shutdown)

    shared_mailbox = {
        "report_array": report_array,
        "report_version": report_version,
        "report_event": report_event,
    }

    aggregator = multiprocessing.Process(
        target=aggregator_process,
        args=(shared_mailbox, stop_event, args.config, args.aggregator_core),
        name="Aggregator",
    )
    writer = multiprocessing.Process(
        target=hid_writer_process,
        args=(shared_mailbox, stop_event, args.writer_core),
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
                report_event.set()
                return_code = 1
                break
            time.sleep(1.0)
    except KeyboardInterrupt:
        logger.info("Shutdown signal received")
        stop_event.set()
        report_event.set()
    finally:
        stop_event.set()
        report_event.set()
        for process in processes:
            process.join(timeout=5.0)
            if process.is_alive():
                logger.warning("Process %s did not exit cleanly, terminating...", process.name)
                process.terminate()

    logger.info("System Shutdown Complete.")
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
