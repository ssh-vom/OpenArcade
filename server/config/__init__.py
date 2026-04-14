"""Configuration management for OpenArcade devices."""

from config.commands import (
    RUNTIME_UPDATE_COMMANDS,
    handle_command,
)
from config.defaults import default_descriptor
from config.store import (
    DeviceConfigStore,
    resolve_default_config_path,
)

__all__ = [
    "DeviceConfigStore",
    "default_descriptor",
    "handle_command",
    "resolve_default_config_path",
    "RUNTIME_UPDATE_COMMANDS",
]
