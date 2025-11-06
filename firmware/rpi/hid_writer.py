from enum import Enum
import time

HID = "/dev/hidg0"


class Modifier(Enum):
    NONE = 0
    LEFT_CTRL = 0x01
    LEFT_SHIFT = 0x02
    LEFT_ALT = 0x04
    LEFT_GUI = 0x08  # WINDOWS or COMMAND
    RIGHT_CTRL = 0x10
    RIGHT_SHIFT = 0x20
    RIGHT_ALT = 0x40
    RIGHT_GUI = 0x80


CHAR_MAP = {
    # LETTERS
    "a": (0x04, Modifier.NONE),
    "b": (0x05, Modifier.NONE),
    "c": (0x06, Modifier.NONE),
    "d": (0x07, Modifier.NONE),
    "e": (0x08, Modifier.NONE),
    "f": (0x09, Modifier.NONE),
    "g": (0x0A, Modifier.NONE),
    "h": (0x0B, Modifier.NONE),
    "i": (0x0C, Modifier.NONE),
    "j": (0x0D, Modifier.NONE),
    "k": (0x0E, Modifier.NONE),
    "l": (0x0F, Modifier.NONE),
    "m": (0x10, Modifier.NONE),
    "n": (0x11, Modifier.NONE),
    "o": (0x12, Modifier.NONE),
    "p": (0x13, Modifier.NONE),
    "q": (0x14, Modifier.NONE),
    "r": (0x15, Modifier.NONE),
    "s": (0x16, Modifier.NONE),
    "t": (0x17, Modifier.NONE),
    "u": (0x18, Modifier.NONE),
    "v": (0x19, Modifier.NONE),
    "w": (0x1A, Modifier.NONE),
    "x": (0x1B, Modifier.NONE),
    "y": (0x1C, Modifier.NONE),
    "z": (0x1D, Modifier.NONE),
    "A": (0x04, Modifier.LEFT_SHIFT),
    "B": (0x05, Modifier.LEFT_SHIFT),
    "C": (0x06, Modifier.LEFT_SHIFT),
    "D": (0x07, Modifier.LEFT_SHIFT),
    "E": (0x08, Modifier.LEFT_SHIFT),
    "F": (0x09, Modifier.LEFT_SHIFT),
    "G": (0x0A, Modifier.LEFT_SHIFT),
    "H": (0x0B, Modifier.LEFT_SHIFT),
    "I": (0x0C, Modifier.LEFT_SHIFT),
    "J": (0x0D, Modifier.LEFT_SHIFT),
    "K": (0x0E, Modifier.LEFT_SHIFT),
    "L": (0x0F, Modifier.LEFT_SHIFT),
    "M": (0x10, Modifier.LEFT_SHIFT),
    "N": (0x11, Modifier.LEFT_SHIFT),
    "O": (0x12, Modifier.LEFT_SHIFT),
    "P": (0x13, Modifier.LEFT_SHIFT),
    "Q": (0x14, Modifier.LEFT_SHIFT),
    "R": (0x15, Modifier.LEFT_SHIFT),
    "S": (0x16, Modifier.LEFT_SHIFT),
    "T": (0x17, Modifier.LEFT_SHIFT),
    "U": (0x18, Modifier.LEFT_SHIFT),
    "V": (0x19, Modifier.LEFT_SHIFT),
    "W": (0x1A, Modifier.LEFT_SHIFT),
    "X": (0x1B, Modifier.LEFT_SHIFT),
    "Y": (0x1C, Modifier.LEFT_SHIFT),
    "Z": (0x1D, Modifier.LEFT_SHIFT),
    # NUMBERS
    "1": (0x1E, Modifier.NONE),
    "2": (0x1F, Modifier.NONE),
    "3": (0x20, Modifier.NONE),
    "4": (0x21, Modifier.NONE),
    "5": (0x22, Modifier.NONE),
    "6": (0x23, Modifier.NONE),
    "7": (0x24, Modifier.NONE),
    "8": (0x25, Modifier.NONE),
    "9": (0x26, Modifier.NONE),
    "0": (0x27, Modifier.NONE),
    # SYMBOLS
    "!": (0x1E, Modifier.LEFT_SHIFT),
    "@": (0x1F, Modifier.LEFT_SHIFT),
    "#": (0x20, Modifier.LEFT_SHIFT),
    "$": (0x21, Modifier.LEFT_SHIFT),
    "%": (0x22, Modifier.LEFT_SHIFT),
    "^": (0x23, Modifier.LEFT_SHIFT),
    "&": (0x24, Modifier.LEFT_SHIFT),
    "*": (0x25, Modifier.LEFT_SHIFT),
    "(": (0x26, Modifier.LEFT_SHIFT),
    ")": (0x27, Modifier.LEFT_SHIFT),
    # PUNCTUATION
    "\n": (0x28, Modifier.NONE),  # Enter
    "\b": (0x2A, Modifier.NONE),  # Backspace
    "\t": (0x2B, Modifier.NONE),  # Tab
    " ": (0x2C, Modifier.NONE),  # Space
    "-": (0x2D, Modifier.NONE),
    "=": (0x2E, Modifier.NONE),
    "[": (0x2F, Modifier.NONE),
    "]": (0x30, Modifier.NONE),
    "\\": (0x31, Modifier.NONE),
    ";": (0x33, Modifier.NONE),
    "'": (0x34, Modifier.NONE),
    "`": (0x35, Modifier.NONE),
    ",": (0x36, Modifier.NONE),
    ".": (0x37, Modifier.NONE),
    "/": (0x38, Modifier.NONE),
    "_": (0x2D, Modifier.LEFT_SHIFT),
    "+": (0x2E, Modifier.LEFT_SHIFT),
    "{": (0x2F, Modifier.LEFT_SHIFT),
    "}": (0x30, Modifier.LEFT_SHIFT),
    "|": (0x31, Modifier.LEFT_SHIFT),
    ":": (0x33, Modifier.LEFT_SHIFT),
    '"': (0x34, Modifier.LEFT_SHIFT),
    "~": (0x35, Modifier.LEFT_SHIFT),
    "<": (0x36, Modifier.LEFT_SHIFT),
    ">": (0x37, Modifier.LEFT_SHIFT),
    "?": (0x38, Modifier.LEFT_SHIFT),
    # SPECIAL KEYS
    "ESC": (0x29, Modifier.NONE),
    "CAPS": (0x39, Modifier.NONE),
    "F1": (0x3A, Modifier.NONE),
    "F2": (0x3B, Modifier.NONE),
    "F3": (0x3C, Modifier.NONE),
    "F4": (0x3D, Modifier.NONE),
    "F5": (0x3E, Modifier.NONE),
    "F6": (0x3F, Modifier.NONE),
    "F7": (0x40, Modifier.NONE),
    "F8": (0x41, Modifier.NONE),
    "F9": (0x42, Modifier.NONE),
    "F10": (0x43, Modifier.NONE),
    "F11": (0x44, Modifier.NONE),
    "F12": (0x45, Modifier.NONE),
    "PRNTSCR": (0x46, Modifier.NONE),
    "SCRL": (0x47, Modifier.NONE),
    "PAUSE": (0x48, Modifier.NONE),
    "INS": (0x49, Modifier.NONE),
    "HOME": (0x4A, Modifier.NONE),
    "PGUP": (0x4B, Modifier.NONE),
    "DEL": (0x4C, Modifier.NONE),
    "END": (0x4D, Modifier.NONE),
    "PGDN": (0x4E, Modifier.NONE),
    "RIGHT": (0x4F, Modifier.NONE),
    "LEFT": (0x50, Modifier.NONE),
    "DOWN": (0x51, Modifier.NONE),
    "UP": (0x52, Modifier.NONE),
}


def type_message(text):
    with open(HID, "rb+") as f:
        for c in text:
            if c in CHAR_MAP:
                code, mod = CHAR_MAP[c]
                report = bytes([mod.value, 0, code, 0, 0, 0, 0, 0])
                f.write(report)
                f.flush()
                time.sleep(0.01)
                f.write(b"\x00" * 8)
                f.flush()
                time.sleep(0.01)


type_message("Hello, World!\n")
