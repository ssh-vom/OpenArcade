import type { EditingMode } from '../domain/profile';
import type { MappingValue } from '../domain/mapping';
import type { PlateId } from '@generated/plate-catalog';

export type Command =
  | { cmd: 'list_devices' }
  | { cmd: 'get_device'; device_id: string }
  | { cmd: 'get_live_state'; device_id: string }
  | { cmd: 'set_mapping'; device_id: string; mode: EditingMode; control_id: string; mapping: MappingValue }
  | { cmd: 'set_ui_binding'; device_id: string; ui_button: string; control_id: string; strategy: 'override' | 'swap' }
  | { cmd: 'set_active_mode'; device_id: string; mode: EditingMode }
  | { cmd: 'set_device_name'; device_id: string; name: string }
  | { cmd: 'list_profiles'; device_id: string }
  | { cmd: 'create_profile'; device_id: string; name: string; plate_id: PlateId | string }
  | { cmd: 'delete_profile'; device_id: string; profile_id: string }
  | { cmd: 'set_active_profile'; device_id: string; profile_id: string }
  | { cmd: 'rename_profile'; device_id: string; profile_id: string; name: string }
  | { cmd: 'set_profile_plate'; device_id: string; profile_id: string; plate_id: PlateId | string }
  | { cmd: 'ping' };

export interface CommandResponse {
  ok: boolean;
  error?: string;
  version?: string;
  devices?: Record<string, unknown>;
  device?: unknown;
  live_state?: {
    pressed_control_ids?: Array<string | number>;
  };
  profile?: unknown;
  profiles?: unknown[];
  [key: string]: unknown;
}
