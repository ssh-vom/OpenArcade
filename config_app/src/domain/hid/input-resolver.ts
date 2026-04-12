import { INPUT_SCHEMA } from '@generated/input-schema';
import type { InputType } from '@/types';

export interface InputOption {
  value: string;
  label: string;
  category?: string;
  isAnalog?: boolean;
  type?: 'bidirectional' | 'unidirectional';
}

export const HID_INPUT_TYPES = {
  GAMEPAD: 'gamepad',
  KEYBOARD: 'keyboard',
  ANALOG: 'analog',
} as const;

export const DEFAULT_LAYOUT = INPUT_SCHEMA.default_layout || {};
export const DEFAULT_MAPPING = INPUT_SCHEMA.default_mapping || {};

export const GAMEPAD_INPUTS = INPUT_SCHEMA.gamepad?.inputs || {};
export const KEYBOARD_INPUTS = INPUT_SCHEMA.keyboard?.inputs || {};
export const ANALOG_INPUTS = INPUT_SCHEMA.analog?.inputs || {};

const KEYCODE_TO_INPUT = new Map(
  Object.entries(KEYBOARD_INPUTS)
    .filter(([, config]) => config?.keycode)
    .map(([input, config]) => [config.keycode as string, input]),
);

export function getKeycodeForInput(inputValue: string): string | null {
  if (!inputValue) {
    return null;
  }

  return (KEYBOARD_INPUTS as Record<string, { keycode?: string }>)[inputValue]?.keycode || null;
}

export function getInputForKeycode(keycodeName: string): string | null {
  if (!keycodeName || typeof keycodeName !== 'string') {
    return null;
  }

  return KEYCODE_TO_INPUT.get(keycodeName) || null;
}

export function getInputOptions(type: InputType): InputOption[] {
  switch (type) {
    case HID_INPUT_TYPES.GAMEPAD:
      return Object.entries(GAMEPAD_INPUTS).map(([value, config]) => ({
        value,
        label: config.label,
        category: config.category,
        isAnalog: config.isAnalog || false,
      }));
    case HID_INPUT_TYPES.KEYBOARD:
      return Object.entries(KEYBOARD_INPUTS).map(([value, config]) => ({
        value,
        label: config.label,
        category: config.category,
        isAnalog: false,
      }));
    case HID_INPUT_TYPES.ANALOG:
      return Object.entries(ANALOG_INPUTS).map(([value, config]) => ({
        value,
        label: config.label,
        type: config.type,
      }));
    default:
      return [];
  }
}

export function getInputLabel(type: InputType, input: string): string {
  switch (type) {
    case HID_INPUT_TYPES.GAMEPAD:
      return (GAMEPAD_INPUTS as Record<string, { label?: string }>)[input]?.label || input;
    case HID_INPUT_TYPES.KEYBOARD:
      return (KEYBOARD_INPUTS as Record<string, { label?: string }>)[input]?.label || input;
    case HID_INPUT_TYPES.ANALOG:
      return (ANALOG_INPUTS as Record<string, { label?: string }>)[input]?.label || input;
    default:
      return input;
  }
}
