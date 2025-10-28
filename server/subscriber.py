import asyncio
from bleak import BleakClient, BleakScanner
from bleak.backends.characteristic import BleakGATTCharacteristic

TIMEOUT_DEFAULT = 20.0
heart_rate_service_uuid = "0000180d-0000-1000-8000-00805f9b34fb"
heart_rate_char_uuid = "00002a37-0000-1000-8000-00805f9b34fb"

target_address_1 = "a0:b7:65:24:9a:ea"
target_address_2 = "f8:b3:b7:3a:01:9a"

# target_address = "a0:b7:65:24:9a:ea"
# target_address = "f8:b3:b7:3a:01:9a"

# target_address = "2F1B3BC0-F834-EF5F-E60A-E6FB94B3C891"
# target_address = "EA:9A:24:65:B7:A0"

# EA:9A:24:65:B7:A0

notification_count = 0 


def disconnect_callback(client: BleakClient):
    """Called when device disconnects"""
    print("[DISCONNECT] Device disconnected!")


async def notification_handler(sender: BleakGATTCharacteristic, data: bytearray):
    """Handle incoming notifications from ESP32"""
    nonlocal notification_count
    try:
        notification_count += 1
        print(
            f"[NOTIFICATION #{notification_count}] {data.hex()} from sender: {sender}"
        )
        if len(data) >= 2:
            heart_rate = int(data[1])
            print(f"[DATA] Heart Rate = {heart_rate} BPM")
    except Exception as e:
        print(f"[ERROR] Exception in handler: {type(e).__name__}: {e}")


async def scan_for_device(target_address):
    """Scan for target device"""
    print("[SCAN] Scanning for devices...")
    # devices = await BleakScanner.discover(timeout=TIMEOUT_DEFAULT)
    # for d in devices:
    #     print(d)
    device = await BleakScanner.find_device_by_address(target_address)
    return device

async def device_function(target):
    async with BleakClient(
            target,
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
                if service.uuid.lower() == heart_rate_service_uuid.lower():
                    print("[DISCOVER] Found Heart Rate Service")
                    for char in service.characteristics:
                        print(f"  - {char.uuid}: {char.properties}")
                        if char.uuid.lower() == heart_rate_char_uuid.lower():
                            characteristic = char
                            print("[DISCOVER] Found heart rate characteristic")
                            break
                    break

            if not characteristic:
                print("[ERROR] Heart rate characteristic not found")
                return

            print("[SUBSCRIBE] Subscribing to notifications...")
            await client.start_notify(characteristic, notification_handler)
            print("[READY] Listening for notifications. Press CTRL+C to exit")

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



async def main():
    global notification_count

    target1 = await scan_for_device(target_address_1)
    if not target1:
        print("[ERROR] Target 1 device not found")
        return
    
    target2 = await scan_for_device(target_address_2)
    if not target2:
        print("[ERROR] Target 2 device not found")
        return

    try:
        print(f"[CONNECT] Connecting to {target1.name} ({target1.address})")
        print(f"[CONNECT] Connecting to {target2.name} ({target2.address})")
        device1 = await device_function(target1)
        device2 = await device_function(target2)


    except Exception as e:
        print(f"[ERROR] Connection error: {type(e).__name__}: {e}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[EXIT] Interrupted by user")
