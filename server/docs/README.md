# Server Configuration

## Overview

Our system makes use of the BLE GATT (Generic Attribute Profile) communication model

It consists of a Server-Client architecture with subscribers pulling from publishers :
* BLE GATT Server &rarr; *Publisher* of data (ESP32)
* BLE GATT Client &rarr; *Subscriber* of data (RPI)

Each child board functions as a server, publishing the state of it's inputs

The central node is our Raspberry Pi Zero 2 W, acting as a BLE GATT client, it 
subscribes to the servers and receives data through notifications

Our minimal working prototype of the pi code is held in `subscriber.py`

It currently:
```
1. Scans for BLE Servers
2. Subscribes to their notifications 
3. Prints out the notifications as they arrive
```

This code runs asynchronously using `asyncio` and the prototype makes use of the `bleak` library

The code can be run using `uv` as follows:


```
uv run subscriber.py
```
