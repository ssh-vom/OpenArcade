export type InputType = 'keyboard' | 'gamepad' | 'analog';

export interface AnalogConfig {
  threshold?: number;
  sensitivity?: number;
  axis?: 'x' | 'y';
  direction?: 'bidirectional' | 'unidirectional';
}

export interface ButtonMapping {
  type: InputType;
  input: string;
  label: string;
  action?: string | Record<string, unknown>;
  analogConfig?: AnalogConfig;
  [key: string]: unknown;
}

export interface MappingValue {
  keycode?: string;
  gamepad_input?: string;
}

export interface MappingStatus {
  type: 'info' | 'success' | 'error';
  message: string;
}
