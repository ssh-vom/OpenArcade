from __future__ import annotations

import argparse
import importlib
import logging
import os
import re
import signal
import subprocess
import threading
from dataclasses import dataclass

from hid_mode_state import HIDModeState
from runtime_ipc import get_connected_devices


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(processName)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("OpenArcade")
TEMPERATURE_OUTPUT_PATTERN = re.compile(r"temp=([0-9]+(?:\.[0-9]+)?)'C")


@dataclass(frozen=True)
class DisplayConfig:
    i2c_port: int
    i2c_address: int
    poll_interval: float
    rotate: int


@dataclass(frozen=True)
class DisplayState:
    module_count: int
    temperature_c: float | None
    hid_mode: str


def _read_env_int(name: str, default: int) -> int:
    raw_value = os.environ.get(name)
    if raw_value in (None, ""):
        return default

    try:
        return int(str(raw_value), 0)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer") from exc


def _read_env_float(name: str, default: float) -> float:
    raw_value = os.environ.get(name)
    if raw_value in (None, ""):
        return default

    try:
        return float(raw_value)
    except ValueError as exc:
        raise ValueError(f"{name} must be a number") from exc


def parse_args() -> DisplayConfig:
    parser = argparse.ArgumentParser(description="OpenArcade parent display service")
    try:
        default_i2c_port = _read_env_int("OPENARCADE_DISPLAY_I2C_PORT", 1)
        default_i2c_address = _read_env_int("OPENARCADE_DISPLAY_I2C_ADDRESS", 0x3C)
        default_poll_interval = _read_env_float("OPENARCADE_DISPLAY_POLL_INTERVAL", 1.0)
        default_rotate = _read_env_int("OPENARCADE_DISPLAY_ROTATE", 0)
    except ValueError as exc:
        parser.error(str(exc))

    parser.add_argument("--i2c-port", type=int, default=default_i2c_port)
    parser.add_argument("--i2c-address", type=int, default=default_i2c_address)
    parser.add_argument("--poll-interval", type=float, default=default_poll_interval)
    parser.add_argument("--rotate", type=int, default=default_rotate)
    args = parser.parse_args()

    if args.poll_interval <= 0:
        parser.error("--poll-interval must be greater than zero")
    if args.i2c_port < 0:
        parser.error("--i2c-port must be zero or greater")
    if args.i2c_address < 0x03 or args.i2c_address > 0x77:
        parser.error("--i2c-address must be a valid 7-bit I2C address")
    if args.rotate not in (0, 1, 2, 3):
        parser.error("--rotate must be one of: 0, 1, 2, 3")

    return DisplayConfig(
        i2c_port=args.i2c_port,
        i2c_address=args.i2c_address,
        poll_interval=args.poll_interval,
        rotate=args.rotate,
    )


class StatusDisplay:
    def __init__(self, config: DisplayConfig) -> None:
        image_font_module = importlib.import_module("PIL.ImageFont")
        serial_module = importlib.import_module("luma.core.interface.serial")
        render_module = importlib.import_module("luma.core.render")
        device_module = importlib.import_module("luma.oled.device")

        self._serial = serial_module.i2c(
            port=config.i2c_port,
            address=config.i2c_address,
        )
        self._device = device_module.ssd1306(
            self._serial,
            width=128,
            height=64,
            rotate=config.rotate,
        )
        self._canvas = render_module.canvas
        self._font = image_font_module.load_default()
        self._last_state: DisplayState | None = None
        self._device.clear()

    def render(self, state: DisplayState) -> None:
        if state == self._last_state:
            return

        title = "OpenArcade"
        count_text = f"Modules: {state.module_count}"
        mode_text = f"Mode: {state.hid_mode.upper()[:2]}"
        temperature_text = (
            f"Temp: {state.temperature_c:.1f}C"
            if state.temperature_c is not None
            else "Temp: n/a"
        )

        with self._canvas(self._device) as draw:
            title_x = self._centered_x(draw, title)
            count_mode_text = f"{count_text}  |  {mode_text}"
            count_mode_x = self._centered_x(draw, count_mode_text)
            temperature_x = self._centered_x(draw, temperature_text)
            
            draw.text((title_x, 10), title, font=self._font, fill="white")
            draw.text((count_mode_x, 28), count_mode_text, font=self._font, fill="white")
            draw.text(
                (temperature_x, 44), temperature_text, font=self._font, fill="white"
            )

        self._last_state = state

    def close(self) -> None:
        self._device.clear()
        self._serial.cleanup()

    def _centered_x(self, draw, text: str) -> int:
        left, _top, right, _bottom = draw.textbbox((0, 0), text, font=self._font)
        text_width = right - left
        return max((self._device.width - text_width) // 2, 0)


def run_service(config: DisplayConfig) -> None:
    stop_event = threading.Event()
    temperature_available: bool | None = None
    hid_mode_state = HIDModeState()

    def _handle_signal(_signum: int, _frame: object) -> None:
        stop_event.set()

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    logger.info(
        "Starting display service on I2C port %s address 0x%02X",
        config.i2c_port,
        config.i2c_address,
    )

    display = StatusDisplay(config)
    try:
        while not stop_event.is_set():
            module_count = len(get_connected_devices())
            temperature_c = read_pi_temperature_c()
            
            # Read current HID mode
            try:
                hid_mode = hid_mode_state.get_active_mode()
            except Exception as e:
                logger.warning(f"Failed to read HID mode: {e}")
                hid_mode = "unknown"
            
            display.render(
                DisplayState(
                    module_count=module_count,
                    temperature_c=temperature_c,
                    hid_mode=hid_mode,
                )
            )

            is_available = temperature_c is not None
            if temperature_available != is_available:
                if is_available:
                    logger.info("Pi temperature reading available")
                else:
                    logger.warning("Unable to read Pi temperature via vcgencmd")
                temperature_available = is_available

            stop_event.wait(config.poll_interval)
    finally:
        display.close()
        logger.info("Display service stopped")


def read_pi_temperature_c() -> float | None:
    try:
        result = subprocess.run(
            ["vcgencmd", "measure_temp"],
            capture_output=True,
            check=True,
            text=True,
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        return None

    match = TEMPERATURE_OUTPUT_PATTERN.search(result.stdout.strip())
    if match is None:
        return None

    return float(match.group(1))


def main() -> int:
    config = parse_args()

    try:
        run_service(config)
    except KeyboardInterrupt:
        logger.info("Shutdown signal received")
    except Exception:
        logger.exception("Display service crashed")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
