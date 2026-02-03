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
    """
    Writes aggregated reports to the USB HID Gadget interface.
    """
    logger.info("HID Writer Process Started")

    # Configuration
    HID_DEV_PATH = "/dev/hidg0"
    use_mock = False
    hid_device = None

    try:
        hid_device = open(HID_DEV_PATH, "wb", buffering=0)
        logger.info(f"Using actual HID interface: {HID_DEV_PATH}")
    except (FileNotFoundError, PermissionError, OSError):
        use_mock = True
        logger.warning(
            f"HID interface {HID_DEV_PATH} not found/accessible. Using MOCK mode (stdout)."
        )

    while not stop_event.is_set():
        try:
            report = hid_queue.get(
                timeout=1.0
            )  # Blocking with timeout to check stop_event

            if use_mock:
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
                hid_device.write(report)

        except queue.Empty:
            continue
        except Exception as e:
            logger.error(f"HID Write Error: {e}")
            time.sleep(1.0)

    if hid_device:
        try:
            hid_device.close()
        except OSError:
            pass

    logger.info("HID Writer Process Exiting")
