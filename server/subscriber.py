import asyncio
from bleak import BleakClient, BleakScanner
from bleak.backends.characteristic import BleakGATTCharacteristic

TIMEOUT_DEFAULT = 20.0


ADDRESSES = [
    "6C99935C-D723-713B-766B-03542EE1E159",
    "2F1B3BC0-F834-EF5F-E60A-E6FB94B3C891",
    "f8:b3:b7:3a:01:9a",
    "a0:b7:65:24:9a:ea",
]

notification_count = 0


def disconnect_callback(client: BleakClient):
    """Called when device disconnects"""
    print("[DISCONNECT] Device disconnected!")


async def create_handler(address):
    async def handler(sender: BleakGATTCharacteristic, data: bytearray):
        print(f"[{address}] Notification: {data.hex()}")

    return handler


def make_notification_handler(device_address: str):
    """Create a unique handler for each device"""
    notification_count = 0

    async def handler(sender: BleakGATTCharacteristic, data: bytearray):
        nonlocal notification_count
        notification_count += 1
        print(
            f"[NOTIFICATION #{notification_count}] From {device_address}: "
            f"{data.hex()} (Sender: {sender.handle})"
        )

    return handler


async def scan_for_device():
    """Scan for target device"""
    print("[SCAN] Scanning for devices...")
    devices = [await BleakScanner.find_device_by_address(addr) for addr in ADDRESSES]
    print(devices)
    return devices


async def connect_to_device(address: str):
    global notification_count

    device = await BleakScanner.find_device_by_address(address, timeout=TIMEOUT_DEFAULT)

    if not device:
        print("[ERROR] Target device not found")
        return

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
                    if notification_count > 0 and notification_count % 10 == 0:
                        print(
                            f"[KEEPALIVE] Received {notification_count} notifications so far..."
                        )
            except asyncio.CancelledError:
                print("[EXIT] Task cancelled")
            finally:
                try:
                    await client.stop_notify(characteristic)
                except Exception as e:
                    print(f"[ERROR] Failed to stop notify: {e}")

            print(
                f"[FINAL] Received {notification_count} total notifications before disconnect"
            )

    except Exception as e:
        print(f"[ERROR] Connection error: {type(e).__name__}: {e}")


async def main():
    tasks = [connect_to_device(addr) for addr in ADDRESSES]
    await asyncio.gather(*tasks)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[EXIT] Interrupted by user")
