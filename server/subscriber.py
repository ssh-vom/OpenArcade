import asyncio
from bleak import BleakClient, BleakScanner

"""
TODO replace these with the actual UUID and Char UUID for testing 
"""
SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb"
CHAR_UUID = "0000fff1-0000-1000-8000-00805f9b34fb"


async def notification_handler(sender: int, data: bytearray):
    # unpacks the notification
    state = int(data[0])
    print(f"[NOTIIFICATION] from id: {sender}: Button State = {state}")


async def scan_for_device():
    print("[SCAN] Scanning for devices")
    devices = await BleakScanner.discover(timeout=5.0)

    for d in devices:
        print(d)
        uuids = []
        uuids = d.details.get("props", {}).get("UUIDS", []) or []
        if any(s.lower() == SERVICE_UUID.lower() for s in uuids):
            print(f"[SCAN] matching device {d.name} ({d.address})")
            return d


async def main():
    target = await scan_for_device()
    if target:
        print("f[CONNECT] Connecting to {target.name} ({target.address})")
        async with BleakClient(target) as client:
            if not client.is_connected:
                print("Failed to connect")
                return

            print("[DISCOVER] Discovering services")
            services = await client.get_services()
            for service in services:
                print(f"Service: {service.uuid}")
                for char in service.characteristics:
                    print(f"Characteristic: {char.uuid}")
            print(f"[SUBSCRIBE] to {CHAR_UUID}")
            print("[READY] Listening for button presses. Press CTRL+C to exit")
            await client.start - notify(CHAR_UUID, notification_handler)
    else:
        print("[SCAN] No matching UUIDs found")

        while True:
            await asyncio.sleep(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nExiting")
