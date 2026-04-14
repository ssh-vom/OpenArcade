"""State management for OpenArcade modes and gadget status."""

from state.config_mode import ConfigModeState, resolve_config_mode_path
from state.gadget import (
    GadgetPersona,
    GadgetState,
    VALID_GADGET_PERSONAS,
    resolve_gadget_state_path,
)
from state.hid_mode import (
    HIDMode,
    HIDModeState,
    LEGACY_HID_MODE_ALIASES,
    VALID_HID_MODES,
    resolve_hid_mode_path,
)
from state.pairing_mode import (
    PairingModeState,
    resolve_pairing_mode_path,
)

__all__ = [
    # HID Mode
    "HIDMode",
    "HIDModeState",
    "LEGACY_HID_MODE_ALIASES",
    "VALID_HID_MODES",
    "resolve_hid_mode_path",
    # Pairing Mode
    "PairingModeState",
    "resolve_pairing_mode_path",
    # Config Mode
    "ConfigModeState",
    "resolve_config_mode_path",
    # Gadget
    "GadgetPersona",
    "GadgetState",
    "VALID_GADGET_PERSONAS",
    "resolve_gadget_state_path",
]
