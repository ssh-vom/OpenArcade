export const HID_INPUT_TYPES = {
  GAMEPAD: 'gamepad',
  KEYBOARD: 'keyboard',
  ANALOG: 'analog',
} as const;

export type HidInputType = (typeof HID_INPUT_TYPES)[keyof typeof HID_INPUT_TYPES];
