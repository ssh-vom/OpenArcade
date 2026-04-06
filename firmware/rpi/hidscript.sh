#!/bin/bash
set -euo pipefail

GADGET_ROOT="/sys/kernel/config/usb_gadget"
GADGET_NAME="openarcade"
GADGET_DIR="$GADGET_ROOT/$GADGET_NAME"
PERSONA="${1:-pc}"

USB_HOST_ADDR="02:12:34:56:78:9a"
USB_DEV_ADDR="02:12:34:56:78:9b"
USB_IPV4_ADDR="169.254.64.64/16"

cleanup_gadget() {
    if [ ! -d "$GADGET_DIR" ]; then
        return
    fi

    echo "[*] Removing existing gadget configuration..."

    if [ -f "$GADGET_DIR/UDC" ]; then
        # During rapid persona rebuilds the gadget may already be partially
        # torn down, and unbinding can return ENODEV. That should not abort
        # cleanup.
        printf '' | tee "$GADGET_DIR/UDC" >/dev/null 2>&1 || true
    fi

    rm -f "$GADGET_DIR/configs/c.1/hid.usb0" 2>/dev/null || true
    rm -f "$GADGET_DIR/configs/c.1/hid.usb1" 2>/dev/null || true
    rm -f "$GADGET_DIR/configs/c.1/acm.usb0" 2>/dev/null || true
    rm -f "$GADGET_DIR/configs/c.1/ecm.usb0" 2>/dev/null || true

    rmdir "$GADGET_DIR/functions/hid.usb0" 2>/dev/null || true
    rmdir "$GADGET_DIR/functions/hid.usb1" 2>/dev/null || true
    rmdir "$GADGET_DIR/functions/acm.usb0" 2>/dev/null || true
    rmdir "$GADGET_DIR/functions/ecm.usb0" 2>/dev/null || true
    rm -rf "$GADGET_DIR/configs" "$GADGET_DIR/functions" "$GADGET_DIR/strings" 2>/dev/null || true
    rmdir --ignore-fail-on-non-empty "$GADGET_DIR" 2>/dev/null || true
    rm -rf "$GADGET_DIR" 2>/dev/null || true
}

ensure_udc() {
    local udc_name
    udc_name=$(ls /sys/class/udc | head -n 1 || true)
    if [ -z "$udc_name" ]; then
        echo "[!] No UDC found. Is dwc2 loaded and overlay enabled?"
        exit 1
    fi
    echo "$udc_name"
}

init_common_gadget() {
    mkdir -p "$GADGET_DIR"
    cd "$GADGET_DIR"
    echo 0x0100 > bcdDevice
    echo 0x0200 > bcdUSB
    mkdir -p strings/0x409
    mkdir -p configs/c.1
}

bind_gadget() {
    local udc_name="$1"
    echo "[*] Binding to UDC: $udc_name"
    echo "$udc_name" > "$GADGET_DIR/UDC"
}

setup_pc_persona() {
    echo "[*] Setting up USB PC composite gadget..."
    init_common_gadget

    echo 0x1d6b > idVendor
    echo 0x0104 > idProduct
    echo "fedcba9876544210" > strings/0x409/serialnumber
    echo "OpenArcade" > strings/0x409/manufacturer
    echo "OpenArcade Multi-Function Gadget" > strings/0x409/product
    mkdir -p configs/c.1/strings/0x409
    echo "Config 1: HID Keyboard + Gamepad" > configs/c.1/strings/0x409/configuration
    echo 250 > configs/c.1/MaxPower

    mkdir -p functions/hid.usb0
    echo 1 > functions/hid.usb0/protocol
    echo 1 > functions/hid.usb0/subclass
    echo 8 > functions/hid.usb0/report_length
    echo -ne \
'\x05\x01\x09\x06\xa1\x01\x05\x07\x19\xe0\x29\xe7\x15\x00\x25\x01'\
'\x75\x01\x95\x08\x81\x02\x95\x01\x75\x08\x81\x03\x95\x05\x75\x01'\
'\x05\x08\x19\x01\x29\x05\x91\x02\x95\x01\x75\x03\x91\x03\x95\x06'\
'\x75\x08\x15\x00\x25\x65\x05\x07\x19\x00\x29\x65\x81\x00\xc0' \
> functions/hid.usb0/report_desc
    ln -s functions/hid.usb0 configs/c.1/

    mkdir -p functions/hid.usb1
    echo 0 > functions/hid.usb1/protocol
    echo 0 > functions/hid.usb1/subclass
    echo 8 > functions/hid.usb1/report_length
    echo -ne \
'\x05\x01'\
'\x09\x05'\
'\xa1\x01'\
'\x05\x09'\
'\x19\x01'\
'\x29\x10'\
'\x15\x00'\
'\x25\x01'\
'\x75\x01'\
'\x95\x10'\
'\x81\x02'\
'\x05\x01'\
'\x09\x39'\
'\x15\x00'\
'\x25\x07'\
'\x35\x00'\
'\x46\x3b\x01'\
'\x65\x14'\
'\x75\x04'\
'\x95\x01'\
'\x81\x42'\
'\x75\x04'\
'\x95\x01'\
'\x81\x01'\
'\x09\x30'\
'\x09\x31'\
'\x09\x32'\
'\x09\x35'\
'\x15\x00'\
'\x26\xff\x00'\
'\x75\x08'\
'\x95\x04'\
'\x81\x02'\
'\x75\x08'\
'\x95\x01'\
'\x81\x01'\
'\xc0' \
> functions/hid.usb1/report_desc
    ln -s functions/hid.usb1 configs/c.1/

    mkdir -p functions/acm.usb0
    ln -s functions/acm.usb0 configs/c.1/

    mkdir -p functions/ecm.usb0
    echo "$USB_HOST_ADDR" > functions/ecm.usb0/host_addr
    echo "$USB_DEV_ADDR" > functions/ecm.usb0/dev_addr
    ln -s functions/ecm.usb0 configs/c.1/
}

setup_switch_hori_persona() {
    echo "[*] Setting up USB Nintendo Switch HORIPAD-compatible gadget..."
    init_common_gadget

    # Emulate the regular wired HORIPAD-for-Switch identity rather than the
    # Pokkén controller identity so browser/controller databases (e.g. Joypad)
    # and host OSes see a mainstream HORIPAD-class device.
    echo 0x0572 > bcdDevice
    echo 0x0f0d > idVendor
    echo 0x00c1 > idProduct
    # Match HORIPAD-style device identity:
    # - iSerial = 0 (no serialnumber string)
    # - iConfiguration = 0 (no configuration string)
    echo "HORI CO.,LTD." > strings/0x409/manufacturer
    echo "HORIPAD S" > strings/0x409/product
    echo 500 > configs/c.1/MaxPower

    mkdir -p functions/hid.usb0
    echo 0 > functions/hid.usb0/protocol
    echo 0 > functions/hid.usb0/subclass
    # HID report is 8 bytes (USB interrupt endpoint packet size remains 64)
    echo 8 > functions/hid.usb0/report_length
    # Real HORI Switch-class devices commonly enumerate with bInterval=5.
    if [ -f functions/hid.usb0/interval ]; then
        echo 5 > functions/hid.usb0/interval
    fi
    if [ -f functions/hid.usb0/no_out_endpoint ]; then
        echo 0 > functions/hid.usb0/no_out_endpoint
    fi
    # Keep the simple Switch-compatible HORI-style report layout:
    #   - 16 button bits
    #   - HAT switch + padding
    #   - 4 axes: X, Y, Z, Rz
    #   - 1 vendor byte
    #   - 8-byte OUT report capability
    # This is a pragmatic compatibility profile while presenting HORIPAD USB identity.
    echo -ne \
'\x05\x01'\
'\x09\x05'\
'\xa1\x01'\
'\x15\x00'\
'\x25\x01'\
'\x35\x00'\
'\x45\x01'\
'\x75\x01'\
'\x95\x10'\
'\x05\x09'\
'\x19\x01'\
'\x29\x10'\
'\x81\x02'\
'\x05\x01'\
'\x25\x07'\
'\x46\x3b\x01'\
'\x75\x04'\
'\x95\x01'\
'\x65\x14'\
'\x09\x39'\
'\x81\x42'\
'\x65\x00'\
'\x95\x01'\
'\x81\x01'\
'\x26\xff\x00'\
'\x46\xff\x00'\
'\x09\x30'\
'\x09\x31'\
'\x09\x32'\
'\x09\x35'\
'\x75\x08'\
'\x95\x04'\
'\x81\x02'\
'\x06\x00\xff'\
'\x09\x20'\
'\x95\x01'\
'\x81\x02'\
'\x0a\x21\x26'\
'\x95\x08'\
'\x91\x02'\
'\xc0' \
> functions/hid.usb0/report_desc
    ln -s functions/hid.usb0 configs/c.1/
}

configure_usb_network() {
    if ip link show usb0 >/dev/null 2>&1; then
        ip link set usb0 up || true
        if ! ip -4 addr show dev usb0 | grep -q "$USB_IPV4_ADDR"; then
            ip addr add "$USB_IPV4_ADDR" dev usb0 || true
        fi
    fi
}

main() {
    if [ ! -d "$GADGET_ROOT" ]; then
        echo "[!] Missing configfs gadget root: $GADGET_ROOT"
        exit 1
    fi

    echo "[*] Requested gadget persona: $PERSONA"
    cleanup_gadget

    case "$PERSONA" in
        pc)
            setup_pc_persona
            ;;
        switch-hori)
            setup_switch_hori_persona
            ;;
        *)
            echo "[!] Unsupported gadget persona: $PERSONA"
            exit 1
            ;;
    esac

    bind_gadget "$(ensure_udc)"

    if [ "$PERSONA" = "pc" ]; then
        configure_usb_network
        echo "[✓] USB PC gadget setup complete"
        echo "    - Keyboard HID: /dev/hidg0"
        echo "    - Gamepad HID: /dev/hidg1"
    else
        echo "[✓] USB Switch HORIPAD-compatible gadget setup complete"
        echo "    - Controller HID: /dev/hidg0"
    fi
}

main "$@"
