import type { Profile } from './profile';

export interface DeviceConfig {
  device_id?: string;
  id?: string;
  name: string;
  connected?: boolean;
  active_profile?: string;
  profiles: Record<string, Profile>;
  ui?: {
    layout?: Record<string, string | null>;
  };
  [key: string]: unknown;
}

export type ConnectionState = 'boot' | 'connecting' | 'connected' | 'error';

export interface BootSelection {
  type: 'demo' | 'serial';
}
