# OpenArcade Server

Python runtime for the Raspberry Pi Zero 2 W parent hub.

Entry points:

- `subscriber.py`: BLE scanner, aggregator, and HID writer supervisor
- `config_daemon.py`: USB serial config daemon for WebSerial/host-side configuration

Runtime state defaults to `server/config.json` in a developer checkout, or to the
path in `OPENARCADE_CONFIG_PATH` when deployed as a service.
