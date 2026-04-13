import { HID_INPUT_TYPES, type HidInputType } from '@/constants';

export interface TypeStyleConfig {
  bg: string;
  border: string;
  text: string;
}

export function getTypeIcon(type: HidInputType | string | undefined): string {
  switch (type) {
    case HID_INPUT_TYPES.GAMEPAD:
      return 'GP';
    case HID_INPUT_TYPES.KEYBOARD:
      return 'KB';
    case HID_INPUT_TYPES.ANALOG:
      return 'AX';
    default:
      return '—';
  }
}

export function getTypeColor(type: HidInputType | string | undefined): string {
  switch (type) {
    case HID_INPUT_TYPES.GAMEPAD:
      return '#5180C1'; // Blue accent
    case HID_INPUT_TYPES.KEYBOARD:
      return '#4A90A4'; // Teal
    case HID_INPUT_TYPES.ANALOG:
      return '#6B9BD1'; // Light blue
    default:
      return '#707070';
  }
}

export function getTypeBorderColor(type: HidInputType | string | undefined): string {
  switch (type) {
    case HID_INPUT_TYPES.GAMEPAD:
      return 'rgba(81, 128, 193, 0.35)';
    case HID_INPUT_TYPES.KEYBOARD:
      return 'rgba(74, 144, 164, 0.35)';
    case HID_INPUT_TYPES.ANALOG:
      return 'rgba(107, 155, 209, 0.35)';
    default:
      return 'rgba(112, 112, 112, 0.3)';
  }
}

export function getTypeStyleConfig(type: HidInputType | string | undefined): TypeStyleConfig {
  switch (type) {
    case HID_INPUT_TYPES.GAMEPAD:
      return {
        bg: 'rgba(81, 128, 193, 0.12)',
        border: 'rgba(81, 128, 193, 0.25)',
        text: '#5180C1',
      };
    case HID_INPUT_TYPES.KEYBOARD:
      return {
        bg: 'rgba(74, 144, 164, 0.12)',
        border: 'rgba(74, 144, 164, 0.25)',
        text: '#4A90A4',
      };
    case HID_INPUT_TYPES.ANALOG:
      return {
        bg: 'rgba(107, 155, 209, 0.12)',
        border: 'rgba(107, 155, 209, 0.25)',
        text: '#6B9BD1',
      };
    default:
      return {
        bg: '#B8B8B8',
        border: '#A0A0A0',
        text: '#707070',
      };
  }
}

export function getTypeLabel(type: HidInputType | string | undefined): string {
  switch (type) {
    case HID_INPUT_TYPES.GAMEPAD:
      return 'Gamepad';
    case HID_INPUT_TYPES.KEYBOARD:
      return 'Keyboard';
    case HID_INPUT_TYPES.ANALOG:
      return 'Analog';
    default:
      return 'Unknown';
  }
}
