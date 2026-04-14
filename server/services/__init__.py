"""Service entry points for OpenArcade systemd services."""

from services.display import main as display_main
from services.gadget_manager import gadget_mode_manager_main
from services.gpio import gpio_service_main
from services.serial import main as serial_main

__all__ = [
    "display_main",
    "gadget_mode_manager_main",
    "gpio_service_main",
    "serial_main",
]
