"""
GPIO Service for Raspberry Pi

Provides GPIO handling for OpenArcade mode controls:
- HID mode cycle button
- Pairing mode toggle button
- Config mode two-button chord
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

# GPIO Configuration - Config mode chord
CONFIG_MODE_CHORD_SECONDS_ENV_VAR = "OPENARCADE_CONFIG_MODE_CHORD_SECONDS"
CONFIG_MODE_CHORD_WINDOW_SECONDS_ENV_VAR = "OPENARCADE_CONFIG_MODE_CHORD_WINDOW_SECONDS"
DEFAULT_CONFIG_MODE_CHORD_SECONDS = 2.0
DEFAULT_CONFIG_MODE_CHORD_WINDOW_SECONDS = 0.35

# Common GPIO Configuration
DEBOUNCE_INTERVAL_SECONDS = 0.35
PRESS_CONFIRMATION_SECONDS = 0.03
POLL_INTERVAL_SECONDS = 0.01


def _parse_non_negative_float_env(
    env_var: str,
    default_value: float,
) -> float:
    raw_value = os.environ.get(env_var)
    if raw_value:
        try:
            value = float(raw_value)
            if value < 0:
                raise ValueError("must be non-negative")
            return value
        except ValueError:
            logger.warning(
                "Invalid %s='%s', using default %.2fs",
                env_var,
                raw_value,
                default_value,
            )
    return default_value


def get_hid_mode_button_pin() -> int:
    pin_str = os.environ.get(HID_MODE_BUTTON_PIN_ENV_VAR)
    if pin_str:
        try:
            return int(pin_str)
        except ValueError:
            logger.warning(
                "Invalid %s='%s', using default pin %s",
                HID_MODE_BUTTON_PIN_ENV_VAR,
                pin_str,
                DEFAULT_HID_MODE_PIN,
            )
    return DEFAULT_HID_MODE_PIN


def get_hid_mode_hold_seconds() -> float:
    return _parse_non_negative_float_env(
        HID_MODE_BUTTON_HOLD_SECONDS_ENV_VAR,
        DEFAULT_HID_MODE_HOLD_SECONDS,
    )


def get_pairing_mode_button_pin() -> int:
    pin_str = os.environ.get(PAIRING_MODE_BUTTON_PIN_ENV_VAR)
    if pin_str:
        try:
            return int(pin_str)
        except ValueError:
            logger.warning(
                "Invalid %s='%s', using default pin %s",
                PAIRING_MODE_BUTTON_PIN_ENV_VAR,
                pin_str,
                DEFAULT_PAIRING_MODE_PIN,
            )
    return DEFAULT_PAIRING_MODE_PIN


def get_pairing_mode_hold_seconds() -> float:
    return _parse_non_negative_float_env(
        PAIRING_MODE_BUTTON_HOLD_SECONDS_ENV_VAR,
        DEFAULT_PAIRING_MODE_HOLD_SECONDS,
    )


def get_config_mode_chord_seconds() -> float:
    return _parse_non_negative_float_env(
        CONFIG_MODE_CHORD_SECONDS_ENV_VAR,
        DEFAULT_CONFIG_MODE_CHORD_SECONDS,
    )


def get_config_mode_chord_window_seconds() -> float:
    return _parse_non_negative_float_env(
        CONFIG_MODE_CHORD_WINDOW_SECONDS_ENV_VAR,
        DEFAULT_CONFIG_MODE_CHORD_WINDOW_SECONDS,
    )


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
            logger.warning("GPIO not available: %s. Running in mock mode.", e)
            self.gpio_available = False

    def setup_button(
        self,
        pin: int,
        callback: Callable[[], None],
        pull_up: bool = True,
    ) -> None:
        del callback  # callback is used by pollers, not by setup.

        if not self.gpio_available or self.GPIO is None:
            logger.info("Mock GPIO: Would setup button on pin %s", pin)
            return

        pull_mode = self.GPIO.PUD_UP if pull_up else self.GPIO.PUD_DOWN
        self.GPIO.setup(pin, self.GPIO.IN, pull_up_down=pull_mode)
        logger.info(
            "Button configured on GPIO pin %s (pull-%s)",
            pin,
            "up" if pull_up else "down",
        )

    def _confirm_pressed(self, pin: int) -> bool:
        if not self.gpio_available or self.GPIO is None:
            return False

        time.sleep(PRESS_CONFIRMATION_SECONDS)
        return self.GPIO.input(pin) == self.GPIO.LOW

    def _safe_invoke(self, callback: Callable[[], None], action_name: str) -> None:
        try:
            callback()
        except Exception as e:
            logger.error("%s callback error: %s", action_name, e, exc_info=True)

    def poll_button(
        self,
        pin: int,
        callback: Callable[[], None],
        debounce_seconds: float = DEBOUNCE_INTERVAL_SECONDS,
        hold_seconds: float = DEFAULT_HID_MODE_HOLD_SECONDS,
        stop_event: Any = None,
        button_name: str = "button",
    ) -> None:
        """Legacy single-button polling helper (kept for compatibility)."""
        if not self.gpio_available or self.GPIO is None:
            logger.info("Mock GPIO: Would poll button on pin %s", pin)
            self._mock_button_poll(callback, stop_event)
            return

        last_press_time = 0.0
        button_armed = True
        press_started_at: float | None = None

        logger.info(
            "Starting %s polling on GPIO pin %s (hold=%.2fs, debounce=%.2fs)",
            button_name,
            pin,
            hold_seconds,
            debounce_seconds,
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
                        if self._confirm_pressed(pin):
                            press_started_at = time.monotonic()
                            logger.info(
                                "%s hold started on GPIO pin %s; hold for %.2fs to toggle",
                                button_name.capitalize(),
                                pin,
                                hold_seconds,
                            )
                    elif (
                        current_time - press_started_at >= hold_seconds
                        and current_time - last_press_time >= debounce_seconds
                    ):
                        last_press_time = current_time
                        button_armed = False
                        logger.info(
                            "%s hold confirmed on GPIO pin %s after %.2fs",
                            button_name.capitalize(),
                            pin,
                            current_time - press_started_at,
                        )
                        self._safe_invoke(callback, button_name.capitalize())

                time.sleep(POLL_INTERVAL_SECONDS)
            except Exception as e:
                logger.error("GPIO polling error on %s: %s", button_name, e, exc_info=True)
                time.sleep(1.0)

        logger.info("Stopped polling %s on GPIO pin %s", button_name, pin)

    def poll_mode_buttons(
        self,
        hid_pin: int,
        pairing_pin: int,
        on_hid_mode_button: Callable[[], None],
        on_pairing_mode_button: Callable[[], None],
        on_config_mode_chord: Callable[[], None],
        hid_hold_seconds: float,
        pairing_hold_seconds: float,
        chord_hold_seconds: float,
        chord_window_seconds: float,
        debounce_seconds: float = DEBOUNCE_INTERVAL_SECONDS,
        stop_event: Any = None,
    ) -> None:
        if not self.gpio_available or self.GPIO is None:
            logger.info(
                "Mock GPIO: Would poll HID pin %s + Pairing pin %s for chord-aware actions",
                hid_pin,
                pairing_pin,
            )
            self._mock_mode_poll(stop_event)
            return

        logger.info(
            "Starting coordinated GPIO polling: hid_pin=%s pairing_pin=%s "
            "hid_hold=%.2fs pairing_hold=%.2fs chord_hold=%.2fs chord_window=%.2fs",
            hid_pin,
            pairing_pin,
            hid_hold_seconds,
            pairing_hold_seconds,
            chord_hold_seconds,
            chord_window_seconds,
        )

        hid_pressed_since: float | None = None
        pairing_pressed_since: float | None = None
        chord_started_at: float | None = None
        waiting_for_release = False
        last_action_time = 0.0

        while stop_event is None or not stop_event.is_set():
            try:
                hid_pressed = self.GPIO.input(hid_pin) == self.GPIO.LOW
                pairing_pressed = self.GPIO.input(pairing_pin) == self.GPIO.LOW

                if waiting_for_release:
                    if not hid_pressed and not pairing_pressed:
                        waiting_for_release = False
                        hid_pressed_since = None
                        pairing_pressed_since = None
                        chord_started_at = None
                        logger.info("Mode inputs rearmed after button release")

                    time.sleep(POLL_INTERVAL_SECONDS)
                    continue

                if hid_pressed:
                    if hid_pressed_since is None and self._confirm_pressed(hid_pin):
                        hid_pressed_since = time.monotonic()
                        logger.info(
                            "HID mode hold started (pin=%s hold=%.2fs)",
                            hid_pin,
                            hid_hold_seconds,
                        )
                else:
                    hid_pressed_since = None

                if pairing_pressed:
                    if pairing_pressed_since is None and self._confirm_pressed(pairing_pin):
                        pairing_pressed_since = time.monotonic()
                        logger.info(
                            "Pairing mode hold started (pin=%s hold=%.2fs)",
                            pairing_pin,
                            pairing_hold_seconds,
                        )
                else:
                    pairing_pressed_since = None

                now = time.monotonic()
                can_trigger = now - last_action_time >= debounce_seconds

                chord_candidate = (
                    hid_pressed_since is not None
                    and pairing_pressed_since is not None
                    and abs(hid_pressed_since - pairing_pressed_since)
                    <= chord_window_seconds
                )

                if chord_candidate:
                    if chord_started_at is None:
                        chord_started_at = max(hid_pressed_since, pairing_pressed_since)
                        logger.info(
                            "Config mode chord candidate started (window %.2fs)",
                            chord_window_seconds,
                        )

                    if (
                        can_trigger
                        and chord_started_at is not None
                        and (now - chord_started_at) >= chord_hold_seconds
                    ):
                        logger.info(
                            "Config mode chord confirmed after %.2fs",
                            now - chord_started_at,
                        )
                        self._safe_invoke(on_config_mode_chord, "config mode chord")
                        last_action_time = now
                        waiting_for_release = True
                        continue
                else:
                    chord_started_at = None

                hid_ready = (
                    hid_pressed_since is not None
                    and pairing_pressed_since is None
                    and (now - hid_pressed_since) >= hid_hold_seconds
                    and (now - hid_pressed_since) >= chord_window_seconds
                )
                if can_trigger and hid_ready:
                    logger.info(
                        "HID mode hold confirmed after %.2fs",
                        now - hid_pressed_since,
                    )
                    self._safe_invoke(on_hid_mode_button, "hid mode button")
                    last_action_time = now
                    waiting_for_release = True
                    continue

                pairing_ready = (
                    pairing_pressed_since is not None
                    and hid_pressed_since is None
                    and (now - pairing_pressed_since) >= pairing_hold_seconds
                    and (now - pairing_pressed_since) >= chord_window_seconds
                )
                if can_trigger and pairing_ready:
                    logger.info(
                        "Pairing mode hold confirmed after %.2fs",
                        now - pairing_pressed_since,
                    )
                    self._safe_invoke(on_pairing_mode_button, "pairing mode button")
                    last_action_time = now
                    waiting_for_release = True
                    continue

                time.sleep(POLL_INTERVAL_SECONDS)
            except Exception as e:
                logger.error("GPIO coordinated polling error: %s", e, exc_info=True)
                time.sleep(1.0)

        logger.info("Stopped coordinated GPIO mode polling")

    def _mock_button_poll(
        self,
        callback: Callable[[], None],
        stop_event: Any = None,
    ) -> None:
        del callback

        logger.info("Mock GPIO: Press Enter in terminal to simulate button press")
        logger.info("Mock GPIO: Ctrl+C to stop")

        while stop_event is None or not stop_event.is_set():
            try:
                time.sleep(0.5)
            except KeyboardInterrupt:
                break

    def _mock_mode_poll(self, stop_event: Any = None) -> None:
        logger.info("Mock GPIO: Coordinated mode polling active (no hardware)")
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
                logger.warning("GPIO cleanup error: %s", e)


def gpio_service_main(stop_event: Any = None) -> None:
    import threading

    from config_mode_state import ConfigModeState
    from hid_mode_state import HIDModeState
    from pairing_mode_state import PairingModeState

    logger.info("GPIO Service Starting")

    hid_mode = HIDModeState()
    pairing_mode = PairingModeState()
    config_mode = ConfigModeState()
    gpio = GPIOService()

    hid_pin = get_hid_mode_button_pin()
    hid_hold = get_hid_mode_hold_seconds()
    pairing_pin = get_pairing_mode_button_pin()
    pairing_hold = get_pairing_mode_hold_seconds()
    chord_hold = get_config_mode_chord_seconds()
    chord_window = get_config_mode_chord_window_seconds()

    if hid_pin == pairing_pin:
        logger.error(
            "FATAL: HID mode pin (%s) and pairing mode pin (%s) are the same! "
            "Please configure different pins via %s and %s",
            hid_pin,
            pairing_pin,
            HID_MODE_BUTTON_PIN_ENV_VAR,
            PAIRING_MODE_BUTTON_PIN_ENV_VAR,
        )
        return

    hid_state = hid_mode.ensure_initialized()
    pairing_state = pairing_mode.ensure_initialized()
    config_state = config_mode.ensure_initialized()
    logger.info("Initial HID mode: %s", hid_state["active_mode"])
    logger.info("Initial pairing mode: enabled=%s", pairing_state["enabled"])
    logger.info("Initial config mode: enabled=%s", config_state["enabled"])

    def on_hid_mode_button_press() -> None:
        try:
            new_state = hid_mode.cycle_mode(source="gpio")
            logger.info(
                "HID mode changed to: %s (sequence: %s)",
                new_state["active_mode"],
                new_state["sequence"],
            )
        except Exception as e:
            logger.error("Failed to toggle HID mode: %s", e, exc_info=True)

    def on_pairing_button_press() -> None:
        try:
            new_state = pairing_mode.toggle(source="gpio")
            logger.info(
                "Pairing mode toggled to: enabled=%s (sequence: %s)",
                new_state["enabled"],
                new_state["sequence"],
            )
        except Exception as e:
            logger.error("Failed to toggle pairing mode: %s", e, exc_info=True)

    def on_config_mode_chord() -> None:
        try:
            new_state = config_mode.toggle(source="gpio")
            logger.info(
                "Config mode toggled to: enabled=%s (sequence: %s)",
                new_state["enabled"],
                new_state["sequence"],
            )
        except Exception as e:
            logger.error("Failed to toggle config mode: %s", e, exc_info=True)

    gpio.setup_button(hid_pin, on_hid_mode_button_press, pull_up=True)
    gpio.setup_button(pairing_pin, on_pairing_button_press, pull_up=True)

    mode_thread = threading.Thread(
        target=gpio.poll_mode_buttons,
        kwargs={
            "hid_pin": hid_pin,
            "pairing_pin": pairing_pin,
            "on_hid_mode_button": on_hid_mode_button_press,
            "on_pairing_mode_button": on_pairing_button_press,
            "on_config_mode_chord": on_config_mode_chord,
            "hid_hold_seconds": hid_hold,
            "pairing_hold_seconds": pairing_hold,
            "chord_hold_seconds": chord_hold,
            "chord_window_seconds": chord_window,
            "debounce_seconds": DEBOUNCE_INTERVAL_SECONDS,
            "stop_event": stop_event,
        },
        daemon=True,
        name="gpio-mode-inputs",
    )

    try:
        mode_thread.start()

        logger.info(
            "GPIO service running - HID: pin %s hold %.2fs, Pairing: pin %s hold %.2fs, "
            "Config chord: hold %.2fs window %.2fs",
            hid_pin,
            hid_hold,
            pairing_pin,
            pairing_hold,
            chord_hold,
            chord_window,
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
