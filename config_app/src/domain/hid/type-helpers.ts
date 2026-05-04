import { HID_INPUT_TYPES, type HidInputType } from '@/constants';

export interface TypeStyleConfig {
  bg: string;
  border: string;
  text: string;
}

interface TypeConfig extends TypeStyleConfig {
  icon: string;
  color: string;
  borderColor: string;
  label: string;
}

const DEFAULT_TYPE_CONFIG: TypeConfig = {
  icon: '—',
  color: '#707070',
  borderColor: 'rgba(112, 112, 112, 0.3)',
  label: 'Unknown',
  bg: '#B8B8B8',
  border: '#A0A0A0',
  text: '#707070',
};

const TYPE_CONFIG: Record<string, TypeConfig> = {
  [HID_INPUT_TYPES.GAMEPAD]: {
    icon: 'GP',
    color: '#5180C1',
    borderColor: 'rgba(81, 128, 193, 0.35)',
    label: 'Gamepad',
    bg: 'rgba(81, 128, 193, 0.12)',
    border: 'rgba(81, 128, 193, 0.25)',
    text: '#5180C1',
  },
  [HID_INPUT_TYPES.KEYBOARD]: {
    icon: 'KB',
    color: '#4A90A4',
    borderColor: 'rgba(74, 144, 164, 0.35)',
    label: 'Keyboard',
    bg: 'rgba(74, 144, 164, 0.12)',
    border: 'rgba(74, 144, 164, 0.25)',
    text: '#4A90A4',
  },
  [HID_INPUT_TYPES.ANALOG]: {
    icon: 'AX',
    color: '#6B9BD1',
    borderColor: 'rgba(107, 155, 209, 0.35)',
    label: 'Analog',
    bg: 'rgba(107, 155, 209, 0.12)',
    border: 'rgba(107, 155, 209, 0.25)',
    text: '#6B9BD1',
  },
};

function getTypeConfig(type: HidInputType | string | undefined): TypeConfig {
  return (type && TYPE_CONFIG[type]) || DEFAULT_TYPE_CONFIG;
}

export function getTypeIcon(type: HidInputType | string | undefined): string {
  return getTypeConfig(type).icon;
}

export function getTypeColor(type: HidInputType | string | undefined): string {
  return getTypeConfig(type).color;
}

export function getTypeBorderColor(type: HidInputType | string | undefined): string {
  return getTypeConfig(type).borderColor;
}

export function getTypeStyleConfig(type: HidInputType | string | undefined): TypeStyleConfig {
  const { bg, border, text } = getTypeConfig(type);
  return { bg, border, text };
}

export function getTypeLabel(type: HidInputType | string | undefined): string {
  return getTypeConfig(type).label;
}
