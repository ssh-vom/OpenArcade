export interface LiveState {
  device_id?: string;
  connected?: boolean;
  raw_state?: number;
  pressed_bits?: Array<string | number>;
  pressed_control_ids: Array<string | number>;
  seq?: number;
  updated_at?: string | null;
}

export interface SerialPortConfig {
  baudRate: number;
}
