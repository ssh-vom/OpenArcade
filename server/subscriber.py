import argparse
import logging
import multiprocessing
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

    # Communication Queue
    hid_queue = multiprocessing.Queue()

    # Control Event
    stop_event = multiprocessing.Event()

    # Create Processes
    p_aggregator = multiprocessing.Process(
        target=aggregator_process,
        args=(hid_queue, stop_event, args.config),
        name="Aggregator",
    )
    p_writer = multiprocessing.Process(
        target=hid_writer_process,
        args=(hid_queue, stop_event),
        name="HIDWriter",
    )

    processes = [
        p_aggregator,
        p_writer,
    ]

    for p in processes:
        p.start()

    logger.info("All processes started. Press Ctrl+C to exit.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("\nShutdown signal received...")
        stop_event.set()  # Signal to kill the program, this should also happen on temperature warning

    # Cleanup
    for p in processes:
        p.join(timeout=5.0)
        if p.is_alive():
            logger.warning(f"Process {p.name} did not exit cleanly, terminating...")
            p.terminate()

    logger.info("System Shutdown Complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
