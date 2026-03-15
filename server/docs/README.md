# Server Configuration

## Overview

Our system makes use of the BLE GATT (Generic Attribute Profile) communication model

It consists of a Server-Client architecture with subscribers pulling from publishers :
* BLE GATT Server &rarr; *Publisher* of data (ESP32)
* BLE GATT Client &rarr; *Subscriber* of data (RPI)

Each child board functions as a server, publishing the state of it's inputs

The central node is our Raspberry Pi Zero 2 W, acting as a BLE GATT client, it 
subscribes to the servers and receives data through notifications

The current Pi runtime entry point is `runtime_main.py`

It currently:
```
1. Scans for BLE Servers
2. Subscribes to their notifications 
3. Aggregates controller state into HID reports
4. Sends the latest report to a dedicated HID output worker
```

This code runs asynchronously using `asyncio` and the prototype makes use of the `bleak` library

The code can be run using `uv` as follows:


```
uv run runtime_main.py
```
