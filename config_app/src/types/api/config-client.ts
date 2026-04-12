import type { DeviceConfig } from '../domain/device';
import type { Profile, EditingMode } from '../domain/profile';
import type { MappingValue } from '../domain/mapping';
import type { PlateId } from '@generated/plate-catalog';
import type { LiveState } from '../hardware/protocol';

export interface IConfigClient {
  connected: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  listDevices(): Promise<Record<string, DeviceConfig>>;
  getDevice(deviceId: string): Promise<DeviceConfig | null>;
  getLiveState(deviceId: string): Promise<LiveState | null>;

  setMapping(
    deviceId: string,
    mode: EditingMode,
    controlId: string,
    mapping: MappingValue,
  ): Promise<unknown>;

  setUiBinding(
    deviceId: string,
    buttonName: string,
    controlId: string,
    strategy?: 'override' | 'swap',
  ): Promise<DeviceConfig | null>;

  setActiveMode(deviceId: string, mode: EditingMode): Promise<unknown>;
  renameDevice(deviceId: string, name: string): Promise<unknown>;

  listProfiles(deviceId: string): Promise<Profile[]>;
  createProfile(deviceId: string, name: string, plateId?: PlateId | string): Promise<Profile>;
  deleteProfile(deviceId: string, profileId: string): Promise<unknown>;
  setActiveProfile(deviceId: string, profileId: string): Promise<DeviceConfig | null>;
  renameProfile(deviceId: string, profileId: string, name: string): Promise<unknown>;
  setProfilePlate(deviceId: string, profileId: string, plateId: PlateId | string): Promise<unknown>;
}
