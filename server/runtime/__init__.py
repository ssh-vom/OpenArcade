"""Runtime components for BLE aggregation and HID output."""

from runtime.aggregator import aggregator_process
from runtime.control_server import RuntimeControlServer
from runtime.hid_writer import hid_writer_process
from runtime.main import main as runtime_main
from runtime.report_builder import (
    build_control_maps,
    build_gamepad_pc_report,
    build_gamepad_switch_hori_report,
    build_keyboard_report,
    build_mapping,
    build_mapping_cache,
    get_pressed_control_ids,
    resolve_gamepad_input,
    resolve_keycode,
)
from runtime.state_reducer import HIDMode, StateReducer

__all__ = [
    # Processes
    "aggregator_process",
    "hid_writer_process",
    "runtime_main",
    # Server
    "RuntimeControlServer",
    # Report Builder
    "build_control_maps",
    "build_gamepad_pc_report",
    "build_gamepad_switch_hori_report",
    "build_keyboard_report",
    "build_mapping",
    "build_mapping_cache",
    "get_pressed_control_ids",
    "resolve_gamepad_input",
    "resolve_keycode",
    # State Reducer
    "HIDMode",
    "StateReducer",
]
