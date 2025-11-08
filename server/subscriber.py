import asyncio
from bleak import BleakClient, BleakScanner
from bleak.backends.characteristic import BleakGATTCharacteristic
from bleak.backends.device import BLEDevice

TIMEOUT_DEFAULT = 20.0
RETRY_COUNT = 2


ADDRESSES = [
    # "6C99935C-D723-713B-766B-03542EE1E159",
    # "2F1B3BC0-F834-EF5F-E60A-E6FB94B3C891",
    # "f8:b3:b7:3a:01:9a",
    "a0:b7:65:24:9a:ea",
]

notification_counts = {}


def disconnect_callback(client: BleakClient):
    """Called when device disconnects"""
    print("[DISCONNECT] Device disconnected!")


def make_notification_handler(device_address: str):
    """Create a unique handler for each device"""
    notification_counts[device_address] = 0

    async def handler(sender: BleakGATTCharacteristic, data: bytearray):
        notification_counts[device_address] += 1
        count = notification_counts[device_address]
        print(f"[NOTIFICATION #{count}] From {device_address}: {data.hex()} ")

    return handler


async def scan_for_devices():
    """Scan for target device"""
    found = []
    for attempt in range(1, RETRY_COUNT + 1):
        for addr in ADDRESSES:
            device = await BleakScanner.find_device_by_address(addr)
            if device:
                found.append(device)

    return found


async def connect_and_subscribe(device: BLEDevice):
    address = device.address

    print(f"[CONNECT] Connecting to device with {address}")
    try:
        async with BleakClient(
            device,
            timeout=TIMEOUT_DEFAULT,
            disconnect_callback=disconnect_callback,
        ) as client:
            if not client.is_connected:
                print("[ERROR] Failed to connect")
                return

            print("[CONNECT] Connected successfully")
            print("[DISCOVER] Discovering services...")

            characteristic = None
            for service in client.services:
                print(service)
                for char in service.characteristics:
                    print(char.description)
                    if char.description == "Heart Rate Measurement":
                        characteristic = char
                        break

            if not characteristic:
                print("[ERROR] Heart rate characteristic not found")
                return

            print("[SUBSCRIBE] Subscribing to notifications...")
            notification_handler = make_notification_handler(address)
            await client.start_notify(characteristic, notification_handler)
            try:
                while client.is_connected:
                    await asyncio.sleep(0.5)
            except asyncio.CancelledError:
                print("[EXIT] Task cancelled")
            finally:
                await client.stop_notify(characteristic)
                print(f"[FINAL] Total notifications: {notification_counts[address]}")

    except Exception as e:
        print(f"[ERROR] Connection error: {type(e).__name__}: {e}")


async def main():
    devices = await scan_for_devices()
    if not devices:
        print("[ERROR] No devices found")
        return

    tasks = []
    for device in devices:
        task = asyncio.create_task(connect_and_subscribe(device))
        tasks.append(task)
        await asyncio.sleep(1.0)
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[EXIT] Interrupted by user")
