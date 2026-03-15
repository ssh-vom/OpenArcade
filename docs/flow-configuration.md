# Configuration Flow (WebSerial)

```mermaid
flowchart LR
    User((User))
    UI[React Config App]
    WebSerial[WebSerial API]
    Serial[/dev/ttyGS0]
    Daemon[serial_config_service.py]
    Store[device_config_store.py]
    Config[config.json]
    Runtime[runtime/control_server.py\nconfig update + live status]

    User --> UI --> WebSerial --> Serial --> Daemon --> Store --> Config
    Daemon --> Runtime
    Daemon -->|response| WebSerial
```
