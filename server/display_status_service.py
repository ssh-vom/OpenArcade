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
from typing import Any

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
    gpio_chip: str
    spi_port: int
    spi_device: int
    dc_pin: int
    rst_pin: int
    spi_speed_hz: int
    poll_interval: float
    rotate: int


@dataclass(frozen=True)
class DisplayState:
    module_count: int
    temperature_c: float | None


def _read_env_int(name: str, default: int) -> int:
    raw_value = os.environ.get(name)
    if raw_value in (None, ""):
        return default

    try:
        return int(raw_value)
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


def _read_env_str(name: str, default: str) -> str:
    raw_value = os.environ.get(name)
    if raw_value in (None, ""):
        return default
    return raw_value


def parse_args() -> DisplayConfig:
    parser = argparse.ArgumentParser(description="OpenArcade parent display service")
    try:
        default_gpio_chip = _read_env_str(
            "OPENARCADE_DISPLAY_GPIO_CHIP", "/dev/gpiochip0"
        )
        default_spi_port = _read_env_int("OPENARCADE_DISPLAY_SPI_PORT", 0)
        default_spi_device = _read_env_int("OPENARCADE_DISPLAY_SPI_DEVICE", 0)
        default_dc_pin = _read_env_int("OPENARCADE_DISPLAY_DC_PIN", 24)
        default_rst_pin = _read_env_int("OPENARCADE_DISPLAY_RST_PIN", 25)
        default_spi_speed_hz = _read_env_int(
            "OPENARCADE_DISPLAY_SPI_SPEED_HZ", 8_000_000
        )
        default_poll_interval = _read_env_float("OPENARCADE_DISPLAY_POLL_INTERVAL", 1.0)
        default_rotate = _read_env_int("OPENARCADE_DISPLAY_ROTATE", 0)
    except ValueError as exc:
        parser.error(str(exc))

    parser.add_argument("--gpio-chip", default=default_gpio_chip)
    parser.add_argument("--spi-port", type=int, default=default_spi_port)
    parser.add_argument("--spi-device", type=int, default=default_spi_device)
    parser.add_argument("--dc-pin", type=int, default=default_dc_pin)
    parser.add_argument("--rst-pin", type=int, default=default_rst_pin)
    parser.add_argument("--spi-speed-hz", type=int, default=default_spi_speed_hz)
    parser.add_argument("--poll-interval", type=float, default=default_poll_interval)
    parser.add_argument("--rotate", type=int, default=default_rotate)
    args = parser.parse_args()

    if args.poll_interval <= 0:
        parser.error("--poll-interval must be greater than zero")
    if args.spi_speed_hz <= 0:
        parser.error("--spi-speed-hz must be greater than zero")
    if args.rotate not in (0, 1, 2, 3):
        parser.error("--rotate must be one of: 0, 1, 2, 3")

    return DisplayConfig(
        gpio_chip=args.gpio_chip,
        spi_port=args.spi_port,
        spi_device=args.spi_device,
        dc_pin=args.dc_pin,
        rst_pin=args.rst_pin,
        spi_speed_hz=args.spi_speed_hz,
        poll_interval=args.poll_interval,
        rotate=args.rotate,
    )


class PeripheryGPIOAdapter:
    LOW = 0
    HIGH = 1
    OUT = 1

    def __init__(self, periphery_module, chip_path: str) -> None:
        self._gpio_class = periphery_module.GPIO
        self._chip_path = chip_path
        self._pins: dict[int, Any] = {}

    def setup(self, pin: int, _direction: int, initial: int | None = None) -> None:
        gpio = self._pins.get(pin)
        if gpio is None:
            direction = "high" if initial else "low"
            gpio = self._gpio_class(self._chip_path, pin, direction)
            self._pins[pin] = gpio
            return

        if initial is not None:
            gpio.write(bool(initial))

    def output(self, pin: int, value: int) -> None:
        self._pins[pin].write(bool(value))

    def cleanup(self, pins: list[int] | int | None = None) -> None:
        if pins is None:
            pins_to_close = list(self._pins)
        elif isinstance(pins, int):
            pins_to_close = [pins]
        else:
            pins_to_close = list(pins)

        for pin in pins_to_close:
            gpio = self._pins.pop(pin, None)
            if gpio is not None:
                gpio.close()


class PeripherySPIAdapter:
    def __init__(self, periphery_module) -> None:
        self._spi_class = periphery_module.SPI
        self._spi = None
        self._mode = 0
        self._max_speed_hz = 8_000_000

    def open(self, port: int, device: int) -> None:
        devpath = f"/dev/spidev{port}.{device}"
        self._spi = self._spi_class(devpath, self._mode, self._max_speed_hz)

    def writebytes(self, data: list[int]) -> None:
        if self._spi is None:
            raise RuntimeError("SPI device is not open")
        self._spi.transfer(data)

    def close(self) -> None:
        if self._spi is not None:
            self._spi.close()
            self._spi = None

    @property
    def mode(self) -> int:
        return self._mode

    @mode.setter
    def mode(self, value: int) -> None:
        self._mode = value
        if self._spi is not None:
            self._spi.mode = value

    @property
    def max_speed_hz(self) -> int:
        return self._max_speed_hz

    @max_speed_hz.setter
    def max_speed_hz(self, value: int) -> None:
        self._max_speed_hz = value
        if self._spi is not None:
            self._spi.max_speed = value


class StatusDisplay:
    def __init__(self, config: DisplayConfig) -> None:
        image_font_module = importlib.import_module("PIL.ImageFont")
        periphery_module = importlib.import_module("periphery")
        serial_module = importlib.import_module("luma.core.interface.serial")
        render_module = importlib.import_module("luma.core.render")
        device_module = importlib.import_module("luma.oled.device")

        self._gpio = PeripheryGPIOAdapter(periphery_module, config.gpio_chip)
        self._spi = PeripherySPIAdapter(periphery_module)
        self._serial = serial_module.spi(
            spi=self._spi,
            gpio=self._gpio,
            port=config.spi_port,
            device=config.spi_device,
            gpio_DC=config.dc_pin,
            gpio_RST=config.rst_pin,
            bus_speed_hz=config.spi_speed_hz,
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
        temperature_text = (
            f"Temp: {state.temperature_c:.1f}C"
            if state.temperature_c is not None
            else "Temp: n/a"
        )

        with self._canvas(self._device) as draw:
            title_x = self._centered_x(draw, title)
            count_x = self._centered_x(draw, count_text)
            temperature_x = self._centered_x(draw, temperature_text)
            draw.text((title_x, 10), title, font=self._font, fill="white")
            draw.text((count_x, 28), count_text, font=self._font, fill="white")
            draw.text(
                (temperature_x, 44), temperature_text, font=self._font, fill="white"
            )

        self._last_state = state

    def close(self) -> None:
        self._device.clear()
        self._serial.cleanup()
        self._gpio.cleanup()

    def _centered_x(self, draw, text: str) -> int:
        left, _top, right, _bottom = draw.textbbox((0, 0), text, font=self._font)
        text_width = right - left
        return max((self._device.width - text_width) // 2, 0)


def run_service(config: DisplayConfig) -> None:
    stop_event = threading.Event()
    temperature_available: bool | None = None

    def _handle_signal(_signum: int, _frame: object) -> None:
        stop_event.set()

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    logger.info(
        "Starting display service on %s and SPI %s.%s (DC=%s, RST=%s)",
        config.gpio_chip,
        config.spi_port,
        config.spi_device,
        config.dc_pin,
        config.rst_pin,
    )

    display = StatusDisplay(config)
    try:
        while not stop_event.is_set():
            module_count = len(get_connected_devices())
            temperature_c = read_pi_temperature_c()
            display.render(
                DisplayState(module_count=module_count, temperature_c=temperature_c)
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
