import type { PlateId } from '@generated/plate-catalog';

export type EditingMode = 'keyboard' | 'gamepad_pc' | 'gamepad_switch_hori' | 'gamepad';

export interface ProfileMode {
  output?: string | null;
  mapping: Record<string, unknown>;
}

export interface Profile {
  id: string;
  name: string;
  plate_id: PlateId | string;
  active_mode: EditingMode;
  modes: Partial<Record<EditingMode, ProfileMode>> & {
    gamepad?: ProfileMode;
  };
  ui?: {
    layout?: Record<string, string | null>;
  };
  [key: string]: unknown;
}
