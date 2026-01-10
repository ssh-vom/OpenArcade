# UUIDs (from firmware/esp32/main/src/gatt_svc.c)
# Service: 666f7065-6e61-7263-6164-650000000001
# Characteristic: 666f7065-6e61-7263-6164-650000000002
SERVICE_UUID = "666f7065-6e61-7263-6164-650000000001"
CHAR_UUID = "666f7065-6e61-7263-6164-650000000002"

# HID Keycodes (USB HID Usage Tables)
HID_KEY_A = 0x04
HID_KEY_B = 0x05
HID_KEY_C = 0x06
HID_KEY_D = 0x07
HID_KEY_E = 0x08
HID_KEY_F = 0x09
HID_KEY_G = 0x0A
HID_KEY_H = 0x0B
HID_KEY_I = 0x0C
HID_KEY_J = 0x0D
HID_KEY_K = 0x0E
HID_KEY_L = 0x0F
HID_KEY_M = 0x10
HID_KEY_N = 0x11
HID_KEY_O = 0x12
HID_KEY_P = 0x13
HID_KEY_Q = 0x14
HID_KEY_R = 0x15
HID_KEY_S = 0x16
HID_KEY_T = 0x17
HID_KEY_U = 0x18
HID_KEY_V = 0x19
HID_KEY_W = 0x1A
HID_KEY_X = 0x1B
HID_KEY_Y = 0x1C
HID_KEY_Z = 0x1D
HID_KEY_1 = 0x1E
HID_KEY_2 = 0x1F
HID_KEY_3 = 0x20
HID_KEY_4 = 0x21
HID_KEY_LEFT = 0x50
HID_KEY_RIGHT = 0x4F
HID_KEY_UP = 0x52
HID_KEY_DOWN = 0x51
HID_KEY_ENTER = 0x28
HID_KEY_SPACE = 0x2C

# Default Mapping: Input Bit Index -> HID Keycode
# See controller_input.h for bit definitions
# 0-7: Buttons 1-8
# 8-11: Joy L, R, U, D
# 12: Select, 13: Start, 14: Pair
DEFAULT_MAPPING = {
    0: HID_KEY_B,  # Button 1
    1: HID_KEY_B,  # Button 2
    2: HID_KEY_C,  # Button 3
    3: HID_KEY_D,  # Button 4
    4: HID_KEY_E,  # Button 5
    5: HID_KEY_F,  # Button 6
    6: HID_KEY_G,  # Button 7
    7: HID_KEY_H,  # Button 8
    8: HID_KEY_LEFT,  # Joy L
    9: HID_KEY_RIGHT,  # Joy R
    10: HID_KEY_UP,  # Joy U
    11: HID_KEY_DOWN,  # Joy D
    12: HID_KEY_SPACE,  # Select
    13: HID_KEY_ENTER,  # Start
}

SCANNER_DELAY = 10
