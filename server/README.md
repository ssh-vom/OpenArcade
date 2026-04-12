# OpenArcade Server

Python runtime for the Raspberry Pi Zero 2 W parent hub.

Entry points:

- `runtime_main.py`: async BLE runtime launcher plus HID output worker supervisor
- `serial_config_service.py`: USB serial config service for WebSerial/host-side configuration
- `config_portal_service.py`: local HTTP config portal service (static UI + /api/command)
- `config_mode_orchestrator_service.py`: state watcher that starts/stops hotspot + portal from config mode
- `display_status_service.py`: I2C SSD1306 parent display renderer for runtime/config-mode status and Pi temperature

Runtime state defaults to `server/config.json` in a developer checkout, or to the
path in `OPENARCADE_CONFIG_PATH` when deployed as a service.
