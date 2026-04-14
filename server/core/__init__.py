"""Core foundation layer for OpenArcade."""

from core.constants import (
    CHAR_UUID,
    DEFAULT_GAMEPAD_MAPPING,
    DEFAULT_MAPPING,
    GAMEPAD_INPUT_MAP,
    SCANNER_DELAY,
    SERVICE_UUID,
    SWITCH_HORI_INPUT_MAP,
)
from core.defaults import default_descriptor
from core.descriptor import (
    ControlDescriptor,
    ControlType,
    DeviceDescriptor,
    ReportFormat,
    parse_info_tlv,
)
from core.ipc import (
    get_connected_devices,
    get_device_states,
    get_pairing_status,
    notify_runtime_config_updated,
    resolve_runtime_socket_path,
)
from core.state import StateManager

__all__ = [
    # Constants
    "CHAR_UUID",
    "DEFAULT_GAMEPAD_MAPPING",
    "DEFAULT_MAPPING",
    "GAMEPAD_INPUT_MAP",
    "SCANNER_DELAY",
    "SERVICE_UUID",
    "SWITCH_HORI_INPUT_MAP",
    # Descriptors
    "ControlDescriptor",
    "ControlType",
    "DeviceDescriptor",
    "ReportFormat",
    "default_descriptor",
    "parse_info_tlv",
    # IPC
    "get_connected_devices",
    "get_device_states",
    "get_pairing_status",
    "notify_runtime_config_updated",
    "resolve_runtime_socket_path",
    # State
    "StateManager",
]
