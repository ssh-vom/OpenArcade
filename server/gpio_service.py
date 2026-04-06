"""
GPIO Service for Raspberry Pi

Provides GPIO handling for OpenArcade, including the HID mode cycle button.
Designed to be reusable for other GPIO-based features.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Callable


logger = logging.getLogger("OpenArcade")


# GPIO Configuration - HID Mode Button
HID_MODE_BUTTON_PIN_ENV_VAR = "OPENARCADE_HID_MODE_PIN"
HID_MODE_BUTTON_HOLD_SECONDS_ENV_VAR = "OPENARCADE_HID_MODE_HOLD_SECONDS"
DEFAULT_HID_MODE_PIN = 4  # GPIO4 (physical pin 7)
DEFAULT_HID_MODE_HOLD_SECONDS = 3.0

# GPIO Configuration - Pairing Mode Button
PAIRING_MODE_BUTTON_PIN_ENV_VAR = "OPENARCADE_PAIRING_MODE_PIN"
PAIRING_MODE_BUTTON_HOLD_SECONDS_ENV_VAR = "OPENARCADE_PAIRING_MODE_HOLD_SECONDS"
DEFAULT_PAIRING_MODE_PIN = 17  # GPIO17 (physical pin 11)
DEFAULT_PAIRING_MODE_HOLD_SECONDS = 1.5

# Common GPIO Configuration
DEBOUNCE_INTERVAL_SECONDS = 0.35
PRESS_CONFIRMATION_SECONDS = 0.03


def get_hid_mode_button_pin() -> int:
    pin_str = os.environ.get(HID_MODE_BUTTON_PIN_ENV_VAR)
    if pin_str:
        try:
            return int(pin_str)
        except ValueError:
            logger.warning(
                f"Invalid {HID_MODE_BUTTON_PIN_ENV_VAR}='{pin_str}', using default pin {DEFAULT_HID_MODE_PIN}"
            )
    return DEFAULT_HID_MODE_PIN


def get_hid_mode_hold_seconds() -> float:
    raw_value = os.environ.get(HID_MODE_BUTTON_HOLD_SECONDS_ENV_VAR)
    if raw_value:
        try:
            value = float(raw_value)
            if value < 0:
                raise ValueError("must be non-negative")
            return value
        except ValueError:
            logger.warning(
                f"Invalid {HID_MODE_BUTTON_HOLD_SECONDS_ENV_VAR}='{raw_value}', "
                f"using default hold time {DEFAULT_HID_MODE_HOLD_SECONDS}s"
            )
    return DEFAULT_HID_MODE_HOLD_SECONDS


def get_pairing_mode_button_pin() -> int:
    pin_str = os.environ.get(PAIRING_MODE_BUTTON_PIN_ENV_VAR)
    if pin_str:
        try:
            return int(pin_str)
        except ValueError:
            logger.warning(
                f"Invalid {PAIRING_MODE_BUTTON_PIN_ENV_VAR}='{pin_str}', "
                f"using default pin {DEFAULT_PAIRING_MODE_PIN}"
            )
    return DEFAULT_PAIRING_MODE_PIN


def get_pairing_mode_hold_seconds() -> float:
    raw_value = os.environ.get(PAIRING_MODE_BUTTON_HOLD_SECONDS_ENV_VAR)
    if raw_value:
        try:
            value = float(raw_value)
            if value < 0:
                raise ValueError("must be non-negative")
            return value
        except ValueError:
            logger.warning(
                f"Invalid {PAIRING_MODE_BUTTON_HOLD_SECONDS_ENV_VAR}='{raw_value}', "
                f"using default hold time {DEFAULT_PAIRING_MODE_HOLD_SECONDS}s"
            )
    return DEFAULT_PAIRING_MODE_HOLD_SECONDS


class GPIOService:
    def __init__(self) -> None:
        self.gpio_available = False
        self.GPIO = None
        self._setup_gpio()

    def _setup_gpio(self) -> None:
        try:
            import RPi.GPIO as GPIO  # type: ignore
            self.GPIO = GPIO
            self.gpio_available = True
            GPIO.setmode(GPIO.BCM)
            GPIO.setwarnings(False)
            logger.info("GPIO initialized successfully")
        except (ImportError, RuntimeError) as e:
            logger.warning(f"GPIO not available: {e}. Running in mock mode.")
            self.gpio_available = False

    def setup_button(
        self,
        pin: int,
        callback: Callable[[], None],
        pull_up: bool = True,
    ) -> None:
        if not self.gpio_available or self.GPIO is None:
            logger.info(f"Mock GPIO: Would setup button on pin {pin}")
            return

        pull_mode = self.GPIO.PUD_UP if pull_up else self.GPIO.PUD_DOWN
        self.GPIO.setup(pin, self.GPIO.IN, pull_up_down=pull_mode)
        logger.info(f"Button configured on GPIO pin {pin} (pull-{'up' if pull_up else 'down'})")

    def poll_button(
        self,
        pin: int,
        callback: Callable[[], None],
        debounce_seconds: float = DEBOUNCE_INTERVAL_SECONDS,
        hold_seconds: float = DEFAULT_HID_MODE_HOLD_SECONDS,
        stop_event: Any = None,
        button_name: str = "button",
    ) -> None:
        if not self.gpio_available or self.GPIO is None:
            logger.info(f"Mock GPIO: Would poll button on pin {pin}")
            self._mock_button_poll(callback, stop_event)
            return

        last_press_time = 0.0
        button_armed = True
        press_started_at: float | None = None

        logger.info(
            f"Starting {button_name} polling on GPIO pin {pin} "
            f"(hold={hold_seconds:.2f}s, debounce={debounce_seconds:.2f}s)"
        )

        while stop_event is None or not stop_event.is_set():
            try:
                current_state = self.GPIO.input(pin)
                current_time = time.monotonic()

                if current_state == self.GPIO.HIGH:
                    button_armed = True
                    press_started_at = None
                elif button_armed:
                    if press_started_at is None:
                        time.sleep(PRESS_CONFIRMATION_SECONDS)
                        if self.GPIO.input(pin) == self.GPIO.LOW:
                            press_started_at = time.monotonic()
                            logger.info(
                                f"{button_name.capitalize()} hold started on GPIO pin {pin}; "
                                f"hold for {hold_seconds:.2f}s to toggle"
                            )
                    elif (
                        current_time - press_started_at >= hold_seconds
                        and current_time - last_press_time >= debounce_seconds
                    ):
                        last_press_time = current_time
                        button_armed = False
                        logger.info(
                            f"{button_name.capitalize()} hold confirmed on GPIO pin {pin} "
                            f"after {current_time - press_started_at:.2f}s"
                        )
                        try:
                            callback()
                        except Exception as e:
                            logger.error(f"{button_name.capitalize()} callback error: {e}", exc_info=True)

                time.sleep(0.01)

            except Exception as e:
                logger.error(f"GPIO polling error on {button_name}: {e}", exc_info=True)
                time.sleep(1.0)

        logger.info(f"Stopped polling {button_name} on GPIO pin {pin}")

    def _mock_button_poll(
        self,
        callback: Callable[[], None],
        stop_event: Any = None,
    ) -> None:
        logger.info("Mock GPIO: Press Enter in terminal to simulate button press")
        logger.info("Mock GPIO: Ctrl+C to stop")

        while stop_event is None or not stop_event.is_set():
            try:
                time.sleep(0.5)
            except KeyboardInterrupt:
                break

    def cleanup(self) -> None:
        if self.gpio_available and self.GPIO is not None:
            try:
                self.GPIO.cleanup()
                logger.info("GPIO cleaned up")
            except Exception as e:
                logger.warning(f"GPIO cleanup error: {e}")


def gpio_service_main(stop_event: Any = None) -> None:
    import threading
    from hid_mode_state import HIDModeState
    from pairing_mode_state import PairingModeState

    logger.info("GPIO Service Starting")

    hid_mode = HIDModeState()
    pairing_mode = PairingModeState()
    gpio = GPIOService()

    hid_pin = get_hid_mode_button_pin()
    hid_hold = get_hid_mode_hold_seconds()
    pairing_pin = get_pairing_mode_button_pin()
    pairing_hold = get_pairing_mode_hold_seconds()

    if hid_pin == pairing_pin:
        logger.error(
            f"FATAL: HID mode pin ({hid_pin}) and pairing mode pin ({pairing_pin}) "
            "are the same! Please configure different pins via "
            f"{HID_MODE_BUTTON_PIN_ENV_VAR} and {PAIRING_MODE_BUTTON_PIN_ENV_VAR}"
        )
        return

    hid_state = hid_mode.ensure_initialized()
    pairing_state = pairing_mode.ensure_initialized()
    logger.info(f"Initial HID mode: {hid_state['active_mode']}")
    logger.info(f"Initial pairing mode: enabled={pairing_state['enabled']}")

    def on_hid_mode_button_press() -> None:
        try:
            new_state = hid_mode.cycle_mode(source="gpio")
            logger.info(
                f"HID mode changed to: {new_state['active_mode']} "
                f"(sequence: {new_state['sequence']})"
            )
        except Exception as e:
            logger.error(f"Failed to toggle HID mode: {e}", exc_info=True)

    def on_pairing_button_press() -> None:
        try:
            new_state = pairing_mode.toggle(source="gpio")
            logger.info(
                f"Pairing mode toggled to: enabled={new_state['enabled']} "
                f"(sequence: {new_state['sequence']})"
            )
        except Exception as e:
            logger.error(f"Failed to toggle pairing mode: {e}", exc_info=True)

    gpio.setup_button(hid_pin, on_hid_mode_button_press, pull_up=True)
    gpio.setup_button(pairing_pin, on_pairing_button_press, pull_up=True)

    hid_thread = threading.Thread(
        target=gpio.poll_button,
        kwargs={
            "pin": hid_pin,
            "callback": on_hid_mode_button_press,
            "debounce_seconds": DEBOUNCE_INTERVAL_SECONDS,
            "hold_seconds": hid_hold,
            "stop_event": stop_event,
            "button_name": "HID mode button",
        },
        daemon=True,
        name="gpio-hid-mode",
    )

    pairing_thread = threading.Thread(
        target=gpio.poll_button,
        kwargs={
            "pin": pairing_pin,
            "callback": on_pairing_button_press,
            "debounce_seconds": DEBOUNCE_INTERVAL_SECONDS,
            "hold_seconds": pairing_hold,
            "stop_event": stop_event,
            "button_name": "pairing mode button",
        },
        daemon=True,
        name="gpio-pairing-mode",
    )

    try:
        hid_thread.start()
        pairing_thread.start()

        logger.info(
            f"GPIO service running - HID button: pin {hid_pin} (hold {hid_hold}s), "
            f"Pairing button: pin {pairing_pin} (hold {pairing_hold}s)"
        )

        while stop_event is None or not stop_event.is_set():
            time.sleep(0.5)

    finally:
        gpio.cleanup()
        logger.info("GPIO Service Exiting")


if __name__ == "__main__":
    import sys

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stdout,
    )

    try:
        gpio_service_main()
    except KeyboardInterrupt:
        logger.info("GPIO Service interrupted by user")
        sys.exit(0)
