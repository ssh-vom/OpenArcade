import type { PlateId } from '@generated/plate-catalog';
import type { ButtonMapping } from './mapping';

export type PositionTuple = [number, number, number];
export type GLBPath = `/${string}.glb` | string;

export interface Module {
  id: string;
  name: string;
  deviceId: string;
  path: GLBPath;
  mappingBanks: {
    keyboard: Record<string, ButtonMapping>;
    gamepad_pc: Record<string, ButtonMapping>;
    gamepad_switch_hori: Record<string, ButtonMapping>;
  };
  position: PositionTuple;
  deviceLayout: Record<string, string | null>;
  connected: boolean;
  plateId?: PlateId | string;
}
