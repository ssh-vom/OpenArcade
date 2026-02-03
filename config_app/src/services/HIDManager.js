import inputSchema from "@shared/input_schema.json";

export const HID_INPUT_TYPES = {
  GAMEPAD: 'gamepad',
  KEYBOARD: 'keyboard',
  ANALOG: 'analog'
};

export const DEFAULT_LAYOUT = inputSchema.default_layout || {};
export const DEFAULT_MAPPING = inputSchema.default_mapping || {};

export const GAMEPAD_INPUTS = inputSchema.gamepad?.inputs || {};
export const KEYBOARD_INPUTS = inputSchema.keyboard?.inputs || {};
export const ANALOG_INPUTS = inputSchema.analog?.inputs || {};

const KEYCODE_TO_INPUT = new Map(
  Object.entries(KEYBOARD_INPUTS)
    .filter(([, config]) => config?.keycode)
    .map(([input, config]) => [config.keycode, input])
);

export const getKeycodeForInput = (inputValue) => {
  if (!inputValue) {
    return null;
  }
  return KEYBOARD_INPUTS[inputValue]?.keycode || null;
};

export const getInputForKeycode = (keycodeName) => {
  if (!keycodeName || typeof keycodeName !== "string") {
    return null;
  }
  return KEYCODE_TO_INPUT.get(keycodeName) || null;
};

// Helper functions
export const getInputOptions = (type) => {
  switch (type) {
    case HID_INPUT_TYPES.GAMEPAD:
      return Object.entries(GAMEPAD_INPUTS).map(([value, config]) => ({
        value,
        label: config.label,
        category: config.category,
        isAnalog: config.isAnalog || false
      }));
    case HID_INPUT_TYPES.KEYBOARD:
      return Object.entries(KEYBOARD_INPUTS).map(([value, config]) => ({
        value,
        label: config.label,
        category: config.category,
        isAnalog: false
      }));
    case HID_INPUT_TYPES.ANALOG:
      return Object.entries(ANALOG_INPUTS).map(([value, config]) => ({
        value,
        label: config.label,
        type: config.type
      }));
    default:
      return [];
  }
};

export const getInputLabel = (type, input) => {
  switch (type) {
    case HID_INPUT_TYPES.GAMEPAD:
      return GAMEPAD_INPUTS[input]?.label || input;
    case HID_INPUT_TYPES.KEYBOARD:
      return KEYBOARD_INPUTS[input]?.label || input;
    case HID_INPUT_TYPES.ANALOG:
      return ANALOG_INPUTS[input]?.label || input;
    default:
      return input;
  }
};
