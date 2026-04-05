"""
GPIO Service for Raspberry Pi

Provides GPIO handling for OpenArcade, including the HID mode toggle button.
Designed to be reusable for other GPIO-based features.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Callable


logger = logging.getLogger("OpenArcade")


# GPIO Configuration
HID_MODE_BUTTON_PIN_ENV_VAR = "OPENARCADE_HID_MODE_PIN"
HID_MODE_BUTTON_HOLD_SECONDS_ENV_VAR = "OPENARCADE_HID_MODE_HOLD_SECONDS"
DEFAULT_HID_MODE_PIN = 4  # GPIO4 (physical pin 7)
DEBOUNCE_INTERVAL_SECONDS = 0.35
PRESS_CONFIRMATION_SECONDS = 0.03
DEFAULT_HOLD_SECONDS = 3.0


def get_hid_mode_button_pin() -> int:
    """Get the GPIO pin number for the HID mode button from environment or use default."""
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
    """Get required button hold time from environment or use default."""
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
                f"using default hold time {DEFAULT_HOLD_SECONDS}s"
            )
    return DEFAULT_HOLD_SECONDS


class GPIOService:
    """
    Generic GPIO service for Raspberry Pi.
    
    Provides:
    - HID mode toggle button monitoring
    - Debouncing
    - Extensible for additional GPIO features
    """

    def __init__(self) -> None:
        self.gpio_available = False
        self.GPIO = None
        self._setup_gpio()

    def _setup_gpio(self) -> None:
        """Initialize GPIO library if available."""
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
        """
        Setup a button on the specified GPIO pin.
        
        Args:
            pin: GPIO pin number (BCM numbering)
            callback: Function to call when button is pressed
            pull_up: If True, use internal pull-up resistor (button pulls to ground)
        """
        if not self.gpio_available or self.GPIO is None:
            logger.info(f"Mock GPIO: Would setup button on pin {pin}")
            return

        pull_mode = self.GPIO.PUD_UP if pull_up else self.GPIO.PUD_DOWN
        self.GPIO.setup(pin, self.GPIO.IN, pull_up_down=pull_mode)
        
        # We'll poll rather than use interrupts for better debouncing control
        logger.info(f"Button configured on GPIO pin {pin} (pull-{'up' if pull_up else 'down'})")

    def poll_button(
        self,
        pin: int,
        callback: Callable[[], None],
        debounce_seconds: float = DEBOUNCE_INTERVAL_SECONDS,
        hold_seconds: float = DEFAULT_HOLD_SECONDS,
        stop_event: Any = None,
    ) -> None:
        """
        Poll a button for presses with debouncing.
        
        Args:
            pin: GPIO pin number (BCM numbering)
            callback: Function to call when button is pressed
            debounce_seconds: Minimum time between recognized button presses
            hold_seconds: Required continuous hold time before press is accepted
            stop_event: Threading/multiprocessing event to signal stop
        """
        if not self.gpio_available or self.GPIO is None:
            logger.info(f"Mock GPIO: Would poll button on pin {pin}")
            # In mock mode, simulate with keyboard input
            self._mock_button_poll(callback, stop_event)
            return

        last_press_time = 0.0
        button_armed = True
        press_started_at: float | None = None

        logger.info(
            f"Starting button polling on GPIO pin {pin} "
            f"(hold={hold_seconds:.2f}s, debounce={debounce_seconds:.2f}s)"
        )

        while stop_event is None or not stop_event.is_set():
            try:
                current_state = self.GPIO.input(pin)
                current_time = time.monotonic()

                if current_state == self.GPIO.HIGH:
                    # Re-arm only after full release.
                    button_armed = True
                    press_started_at = None
                elif button_armed:
                    # Start timing only after a brief low confirmation.
                    if press_started_at is None:
                        time.sleep(PRESS_CONFIRMATION_SECONDS)
                        if self.GPIO.input(pin) == self.GPIO.LOW:
                            press_started_at = time.monotonic()
                            logger.info(
                                f"Button hold started on GPIO pin {pin}; "
                                f"hold for {hold_seconds:.2f}s to toggle HID mode"
                            )
                    elif (
                        current_time - press_started_at >= hold_seconds
                        and current_time - last_press_time >= debounce_seconds
                    ):
                        last_press_time = current_time
                        button_armed = False
                        logger.info(
                            f"Button hold confirmed on GPIO pin {pin} "
                            f"after {current_time - press_started_at:.2f}s"
                        )
                        try:
                            callback()
                        except Exception as e:
                            logger.error(f"Button callback error: {e}", exc_info=True)

                time.sleep(0.01)  # 10ms poll interval

            except Exception as e:
                logger.error(f"GPIO polling error: {e}", exc_info=True)
                time.sleep(1.0)

        logger.info(f"Stopped polling button on GPIO pin {pin}")

    def _mock_button_poll(
        self,
        callback: Callable[[], None],
        stop_event: Any = None,
    ) -> None:
        """Mock button polling for development without GPIO hardware."""
        logger.info("Mock GPIO: Press Enter in terminal to simulate button press")
        logger.info("Mock GPIO: Ctrl+C to stop")
        
        while stop_event is None or not stop_event.is_set():
            try:
                # Simple stdin polling would block, so just sleep
                # In real mock mode, you could use select() or threading
                time.sleep(0.5)
            except KeyboardInterrupt:
                break

    def cleanup(self) -> None:
        """Clean up GPIO resources."""
        if self.gpio_available and self.GPIO is not None:
            try:
                self.GPIO.cleanup()
                logger.info("GPIO cleaned up")
            except Exception as e:
                logger.warning(f"GPIO cleanup error: {e}")


def gpio_service_main(stop_event: Any = None) -> None:
    """
    Main entry point for GPIO service.
    
    Monitors the HID mode button and toggles between keyboard/gamepad modes.
    
    Args:
        stop_event: Threading/multiprocessing event to signal shutdown
    """
    from hid_mode_state import HIDModeState

    logger.info("GPIO Service Starting")

    hid_mode = HIDModeState()
    gpio = GPIOService()
    
    # Ensure initial state file exists
    current_state = hid_mode.ensure_initialized()
    logger.info(f"Initial HID mode: {current_state['active_mode']}")

    def on_mode_button_press() -> None:
        """Handle HID mode button press - toggle between keyboard and gamepad."""
        try:
            new_state = hid_mode.toggle_mode(source="gpio")
            logger.info(
                f"HID mode toggled to: {new_state['active_mode']} "
                f"(sequence: {new_state['sequence']})"
            )
        except Exception as e:
            logger.error(f"Failed to toggle HID mode: {e}", exc_info=True)

    # Setup and poll the HID mode button
    pin = get_hid_mode_button_pin()
    hold_seconds = get_hid_mode_hold_seconds()
    gpio.setup_button(pin, on_mode_button_press, pull_up=True)
    
    try:
        gpio.poll_button(
            pin,
            on_mode_button_press,
            debounce_seconds=DEBOUNCE_INTERVAL_SECONDS,
            hold_seconds=hold_seconds,
            stop_event=stop_event,
        )
    finally:
        gpio.cleanup()
        logger.info("GPIO Service Exiting")


if __name__ == "__main__":
    import sys
    
    # Setup logging
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
