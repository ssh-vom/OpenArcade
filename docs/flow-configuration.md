# Configuration Flow (WebSerial)

```mermaid
flowchart LR
    User((User))
    UI[React Config App]
    WebSerial[WebSerial API]
    Serial[/dev/ttyGS0]
    Daemon[config_daemon.py]
    Store[ConfigStore]
    Config[config.json]
    Aggregator[aggregator.py\nMapping Cache]

    User --> UI --> WebSerial --> Serial --> Daemon --> Store --> Config
    Store --> Aggregator
    Daemon -->|response| WebSerial
```
