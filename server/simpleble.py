import time
import simplepyble


def main():
    UUID = "6C99935C-D723-713B-766B-03542EE1E159"
    adapters = simplepyble.Adapter.get_adapters()

    adapter = adapters[0]

    adapter.set_callback_on_scan_start(lambda: print("Scan started."))
    adapter.set_callback_on_scan_stop(lambda: print("Scan complete."))

    # adapter.set_callback_on_scan_found(
    #     lambda peripheral: print(
    #         f"Found {peripheral.identifier()} [{peripheral.address()}]"
    #     )
    # )

    adapter.scan_for(5000)
    peripherals = adapter.scan_get_results()

    for i, p in enumerate(peripherals):
        # print(f"{i}: {p.identifier()} [{p.address()}]")
        if p.address() == UUID:
            selected_device = p
            print(f"Selected: {selected_device}")
            break

    selected_device.connect()
    service_uuid = "0000180d-0000-1000-8000-00805f9b34fb"
    char_uuid = "00002a37-0000-1000-8000-00805f9b34fb"

    while 1:
        selected_device.notify(
            service_uuid, char_uuid, lambda data: print(f"Notification: {data}")
        )
        time.sleep(1)


if __name__ == "__main__":
    main()
