# Motherboard V1 Communication Protocol Spec 

## Purpose:

This document aims to list out the possible modes of messaging over BLE and HID for the 
Motherboard communicating from child-board to motherboard and vice-versa. 

## High-Level Flow:


1. `BOOT`/`HELLO`: Child-board sends HELLO message (`capabilities, num_buttons, unique id, fw_version`)
board may enter a `CONFIG\_WAIT`
2. Motherboard collects HELLO messages, assigns mappings based on profiles and requests.
3. `CONFIG`: Motherboard sends packet to all boards in `CONFIG_WAIT` with config information,
debounce, reporting, etc.
4. `CONFIG_ACK`: Child-board confirms receipt of messaging, upon success enters the `INPUT`
mode.
5. `INPUT`: Child-board sends it's button state each tick while the Motherboard monitors and aggregates
6. `AGGREGATE`: Motherboard converts the input streams collected into a bitfield for an HID report.
7. `SEND`: Motherboard sends the HID report. (Follows a similar nature to UDP, where we ignore missed packets
and move onto the next packet)

## Packet-Framing

Messages will occur in the following order and types:

[ Characteristic (1B) | Type (1B) | Length (1B) | Payload (N bytes) | CRC16 (2B) ]

`Type` = packet type enum

`Length` = payload length in bytes

`CRC16` = Checksum, may not be required if the transport is secure.

## Packet Types (Type byte)

| Value | Name        | Direction | Purpose                                |
|------:|-------------|-----------|-----------------------------------------|
| 0x01  | HELLO       | Sub→Main  | Announces capabilities on boot          |
| 0x02  | CONFIG      | Main→Sub  | Assign offset, debounce, rate, modes    |
| 0x03  | CONFIG_ACK  | Sub→Main  | Accept/reject config                    |
| 0x04  | INPUT       | Sub→Main  | Regular bitfield + seq packet           |
| 0x05  | HEARTBEAT   | Sub→Main  | Keepalive if no INPUT sent recently     |
| 0x06  | INFO        | Sub↔Main  | Diagnostics, version, NVM request       |


## Payloads

### `HELLO` (child &rarr; mother)
```
uint8_t version; // protocol minor version
uint8_t reserved; // align
uint8_t num_buttons; // local count (1..64)
uint8_t capability_flags; // bitfield: ANALOG(1), ENCODER(2), etc
uint32_t unique_id; // optional, 0 if not present
uint16_t fw_ver; // firmware version
```

### `CONFIG` (mother &rarr; child)
```
```

### `CONFIG_ACK` (mother &rarr; child)
```
```

### `INPUT` (child &rarr; mother)

```
```



# GPIO Mapping Layout For Each Child Board


*Raspberry Pi (Motherboard)*
    - Most likely swapping out of python for this 
        - Might be C, C++, Rust (Need to use the system hci layer messaging like gatttool does)
            - Hopefully library to do this in the above mentioned languages 
            - Need to look at a different BlueZ/BLE specific library for reading
                - Look at simpleBLE/bindings/find out any performance bottlenecks in the library
                - Look at bumble library (still in python) https://github.com/google/bumble
    - Polling (BLE read from child devices)
        - Arbitration / forming big packet for HID
    - Pairing 
        - Always scanning on core
    - HID
    - Possibly config
    - Need to make this properly cleaned, i.e. ensure that the code does the following:
    - Automatically startup and have the scanning core, polling core, hid core, etc running
    - Send messages with a message queue, pipes, or sockets, etc
*ESP32 Child Board*
    - Need to ensure that all the GPIO pins are working and running based on interrupts for button presses
    - Properly parse the joystick messaging 
    - Ensure it follows documented packet type enums (both sides aka raspberry pi and esp32)
    - Ensure that we store all necessary mappings of control for the HID core/aggregation/configuration
        ( on main board receiving from the child board )

# TODO:
Next Steps: 

*Child Board ESP32*:
0. Need to figure out exactly which pins are not reserved/which will be each of:
    button\_# -> GPIO\_# (will need to be sure of these because they will determine the 
    packet order (how we read the messages), the configuration layout/how we read the messages, 
    we want buttons on pins that have internal pull down/pull up  (led doesn't seem to work on pull up)
    this stays true for joystick
    (we have enough for a controller)
    I think we have 9 gpio internal pull up/pull down free for pushbutton
    I think we have 5 gpio internal pull up/pull down free for a joystick (the wires for the joystick for example
    should be close to one another)
1. We need to test joystick -> get joystick working on GPIO
2. Packet types: [ Characteristic (1B) | Type (1B) | Length (1B) | Payload (N bytes) | CRC16 (2B) ]
    - Create packet payloads for each type in packet enum table
3. Clean up the code for the esp32 to remove some of the starter
    - Slowly replacing functionality from the BLE example
    - This is required because we also need to implement kind of state machine of 
        - BOOT
        - Advertise
        - Send (Paired)
        - Need to add structured information about Paired status
        Need to also figure out reporting on ADC pins for battery life
4. Convert current code to send entire bitfield of all gpio button states.
5. Adding button for power on/off for the physical board
    - I think mitchel made a physical switch
6. Need to add a pairing button for beginning advertise (Maybe will just start and stop advertisement)

*Motherboard Raspberry Pi*:
1. Convert code to new framework/language 
    - Probably needs bare-bones quick notification reading test again
    - Look at simpleBLE/bindings/find out any performance bottlenecks in the library
    - Look at bumble library (still in python) https://github.com/google/bumble
    - Other possible libraries could be looked at 
    - If none of the libraries have functionality we need might have to write directly to blueZ linux staclk
1.5. Update on pi the hidscript.sh 
    - This script currently registers the device as a generic keyboard
    - Need to figure out end state of the hid report so that we can structure the aggregation code
        - Need to change to probably gamepad

2. Implement 4 core model
    - Pairing on 1 core (Lower duty cycle, as only needs to look for new devices sometimes) (always scanning)
        - Needs to send message to either socket, pipe, or message queue of device id that is connected
    - Polling BLE on 1 core (This is always reading once there is a device in paired status)
        - Reads the devices that are currently paired and polls their notifications
        - Aggregates the messages on each tick to pass to the HID writer
    - HID on 1 core 
        - Writing to /dev/hidg0 with the hid report for the gadget that has already been registered
        - Aggregation code might live on this core as well or we can possibly dedicate an entire core to doing this
    - Possibly config on 1 core 
        - This might not need a core but basically will take in a request from the webui
            - webui will ask in some packet : [Config (0x8), ID, Button\_Index, cur\_mapping, new\_mapping]:
                - We can use the cur mapping and new mapping + the id/button index to act as their own checksum
                - Need to get a message back to confirm the change happened
                - Configs might live in a file possibly json key value type of thing

Configurator application:
    1. Determining the config structure of how to map from button to HID report to aggregate reader
        - Determining the HID format 
    2. Need to be able to edit the underlying state of that meaning/pull the current button meaning
        - Literally probably just reading from a file
            - We want the config to be updating live 
            - we need a procedure that essentially tells the raspberry pi that the meaning in the aggregator 
            has updated
            - Aggregator <-> Configurator (Also doesn't happen frequently, so we can probably just spin up a thread)
            - When we open configurator there should be an exchange between the raspberry pi and the device
            that says I am configuring you right now, and that will 
                - Screen on esp32 (LED for now) -> we're always basically sending an advertisement
    - [x] Map from CAD model directly to the UI and be able to edit the underlying button meaning for each board


*PCB*:
- Probably need to double check that esp32 is already firmware imaged
- Should happen in parallel does not block the design of the other components/working on the board


