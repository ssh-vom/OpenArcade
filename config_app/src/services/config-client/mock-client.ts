import { DEFAULT_LAYOUT } from '@/domain/hid';
import { DEFAULT_PLATE_ID } from '@/domain/plate';
import type {
  DeviceConfig,
  EditingMode,
  IConfigClient,
  LiveState,
  MappingValue,
  Profile,
} from '@/types';

const STORAGE_KEY = 'openarcade_config';
const DEFAULT_DEVICE_ID = 'OA-001';

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export interface MockClientOptions {
  storageKey?: string;
  deviceId?: string;
}

interface MockState {
  schema_version: number;
  devices: Record<string, DeviceConfig>;
}

class MockConfigClient implements IConfigClient {
  connected = false;

  private storageKey: string;
  private deviceId: string;
  private _data: MockState | null = null;

  constructor({ storageKey = STORAGE_KEY, deviceId = DEFAULT_DEVICE_ID }: MockClientOptions = {}) {
    this.storageKey = storageKey;
    this.deviceId = deviceId;
    this._load();
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async listDevices(): Promise<Record<string, DeviceConfig>> {
    this._ensureDevice(this.deviceId);
    return deepClone(this._data?.devices || {});
  }

  async getDevice(deviceId: string): Promise<DeviceConfig | null> {
    const device = this._data?.devices?.[deviceId];
    return device ? deepClone(device) : null;
  }

  async getLiveState(deviceId: string): Promise<LiveState | null> {
    const device = this._data?.devices?.[deviceId];

    return {
      device_id: deviceId,
      connected: device?.connected !== false,
      raw_state: 0,
      pressed_bits: [],
      pressed_control_ids: [],
      seq: 0,
      updated_at: null,
    };
  }

  async setMapping(
    deviceId: string,
    mode: EditingMode,
    controlId: string,
    mapping: MappingValue,
  ): Promise<{ ok: true }> {
    const device = this._ensureDevice(deviceId);
    const profile = this._getActiveProfile(device);
    if (!profile) {
      throw new Error('profile_not_found');
    }

    const modeEntry = profile.modes?.[mode] || { output: null, mapping: {} };
    modeEntry.mapping[String(controlId)] = mapping;
    profile.modes = profile.modes || {};
    profile.modes[mode] = modeEntry;

    (device as any).last_seen = new Date().toISOString();
    this._save();

    return { ok: true };
  }

  async setUiBinding(
    deviceId: string,
    buttonName: string,
    controlId: string,
    strategy: 'override' | 'swap' = 'override',
  ): Promise<DeviceConfig | null> {
    const device = this._ensureDevice(deviceId);
    const profile = this._getActiveProfile(device);
    if (!profile) {
      throw new Error('profile_not_found');
    }

    const layout = this._normalizeLayout(profile.ui?.layout);
    const normalizedControlId = this._normalizeControlId(controlId);
    this._applyLayoutBinding(layout, buttonName, normalizedControlId, strategy);

    profile.ui = {
      ...profile.ui,
      layout,
    };

    (device as any).last_seen = new Date().toISOString();
    this._save();

    return deepClone(device);
  }

  async setActiveMode(deviceId: string, mode: EditingMode): Promise<{ ok: true }> {
    const device = this._ensureDevice(deviceId);
    const profile = this._getActiveProfile(device);
    if (!profile) {
      throw new Error('profile_not_found');
    }

    profile.active_mode = mode;
    (device as any).last_seen = new Date().toISOString();
    this._save();

    return { ok: true };
  }

  async renameDevice(deviceId: string, name: string): Promise<{ ok: true }> {
    const device = this._ensureDevice(deviceId);
    device.name = name.trim();
    (device as any).last_seen = new Date().toISOString();
    this._save();

    return { ok: true };
  }

  async listProfiles(deviceId: string): Promise<Profile[]> {
    const device = this._ensureDevice(deviceId);
    return deepClone(Object.values(device.profiles || {})) as Profile[];
  }

  async createProfile(deviceId: string, name: string, plateId = DEFAULT_PLATE_ID): Promise<Profile> {
    const device = this._ensureDevice(deviceId);
    const id = `profile-${Date.now()}`;
    const activeProfile = this._getActiveProfile(device) || ({} as Profile);
    const newProfile: Profile = {
      id,
      name,
      plate_id: plateId,
      active_mode: activeProfile.active_mode || 'keyboard',
      modes: deepClone(
        activeProfile.modes || {
          keyboard: { output: 'hid_keyboard', mapping: {} },
          gamepad: { output: 'hid_gamepad', mapping: {} },
          gamepad_pc: { output: 'hid_gamepad_pc', mapping: {} },
          gamepad_switch_hori: { output: 'hid_gamepad_switch_hori', mapping: {} },
        },
      ),
      ui: { layout: deepClone(activeProfile.ui?.layout || {}) },
    };

    device.profiles[id] = newProfile;
    this._save();

    return deepClone(newProfile);
  }

  async deleteProfile(deviceId: string, profileId: string): Promise<{ ok: true }> {
    const device = this._ensureDevice(deviceId);
    const profiles = device.profiles || {};

    if (Object.keys(profiles).length <= 1) {
      throw new Error('cannot_delete_only_profile');
    }

    if (device.active_profile === profileId) {
      throw new Error('cannot_delete_active_profile');
    }

    delete profiles[profileId];
    this._save();

    return { ok: true };
  }

  async setActiveProfile(deviceId: string, profileId: string): Promise<DeviceConfig | null> {
    const device = this._ensureDevice(deviceId);

    if (!device.profiles?.[profileId]) {
      throw new Error('profile_not_found');
    }

    device.active_profile = profileId;
    (device as any).last_seen = new Date().toISOString();
    this._save();

    return deepClone(device);
  }

  async renameProfile(deviceId: string, profileId: string, name: string): Promise<{ ok: true }> {
    const device = this._ensureDevice(deviceId);

    if (!device.profiles?.[profileId]) {
      throw new Error('profile_not_found');
    }

    device.profiles[profileId].name = name;
    this._save();

    return { ok: true };
  }

  async setProfilePlate(deviceId: string, profileId: string, plateId: string): Promise<{ ok: true }> {
    const device = this._ensureDevice(deviceId);

    if (!device.profiles?.[profileId]) {
      throw new Error('profile_not_found');
    }

    device.profiles[profileId].plate_id = plateId;
    this._save();

    return { ok: true };
  }

  private _getActiveProfile(device: DeviceConfig): Profile | null {
    return (device?.profiles?.[device.active_profile || ''] as Profile) || null;
  }

  private _normalizeControlId(controlId: unknown): string | null {
    if (controlId == null) {
      return null;
    }

    const normalized = String(controlId).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private _applyLayoutBinding(
    layout: Record<string, string | null>,
    buttonName: string,
    controlId: string | null,
    strategy: 'override' | 'swap' = 'override',
  ): void {
    if (typeof buttonName !== 'string' || !buttonName) {
      return;
    }

    const previousControlId = layout[buttonName] ?? null;

    let existingButton: string | null = null;
    if (controlId != null) {
      existingButton =
        Object.entries(layout).find(
          ([currentButtonName, assignedControlId]) =>
            currentButtonName !== buttonName &&
            assignedControlId != null &&
            String(assignedControlId) === controlId,
        )?.[0] || null;
    }

    if (existingButton) {
      if (strategy === 'swap') {
        layout[existingButton] = previousControlId;
      } else {
        layout[existingButton] = null;
      }
    }

    layout[buttonName] = controlId;
  }

  private _normalizeLayout(layout?: Record<string, unknown>): Record<string, string | null> {
    const normalizedLayout: Record<string, string | null> = {
      ...Object.fromEntries(
        Object.entries(DEFAULT_LAYOUT).map(([buttonName, controlId]) => [buttonName, String(controlId)]),
      ),
    };

    if (!layout || typeof layout !== 'object') {
      return normalizedLayout;
    }

    Object.entries(layout).forEach(([buttonName, rawControlId]) => {
      const normalizedControlId = this._normalizeControlId(rawControlId);
      this._applyLayoutBinding(normalizedLayout, buttonName, normalizedControlId, 'override');
    });

    return normalizedLayout;
  }

  private _defaultState(): MockState {
    return {
      schema_version: 1,
      devices: {},
    };
  }

  private _defaultDevice(deviceId: string): DeviceConfig {
    return {
      device_id: deviceId,
      name: `OpenArcade ${deviceId}`,
      connected: true,
      active_profile: 'default-profile',
      profiles: {
        'default-profile': {
          id: 'default-profile',
          name: 'Default',
          plate_id: DEFAULT_PLATE_ID,
          active_mode: 'keyboard',
          modes: {
            keyboard: { output: 'hid_keyboard', mapping: {} },
            gamepad: { output: 'hid_gamepad', mapping: {} },
            gamepad_pc: { output: 'hid_gamepad_pc', mapping: {} },
            gamepad_switch_hori: { output: 'hid_gamepad_switch_hori', mapping: {} },
          },
          ui: {
            layout: deepClone(DEFAULT_LAYOUT),
          },
        },
      },
      descriptor: null,
      last_seen: new Date().toISOString(),
    } as DeviceConfig;
  }

  private _load(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      this._data = stored ? (JSON.parse(stored) as MockState) : this._defaultState();
      this._migrateData();
    } catch (error) {
      console.warn('Failed to load mock config:', error);
      this._data = this._defaultState();
    }
  }

  private _migrateData(): void {
    if (!this._data?.devices) {
      return;
    }

    let migrated = false;

    Object.values(this._data.devices).forEach((device) => {
      if (!device) {
        return;
      }

      if (!device.profiles) {
        const profileId = 'default-profile';
        const profile: Profile = {
          id: profileId,
          name: 'Default',
          plate_id: DEFAULT_PLATE_ID,
          active_mode: ((device as any).active_mode || 'keyboard') as EditingMode,
          modes:
            (device as any).modes || {
              keyboard: { output: 'hid_keyboard', mapping: {} },
              gamepad: { output: 'hid_gamepad', mapping: {} },
              gamepad_pc: { output: 'hid_gamepad_pc', mapping: {} },
              gamepad_switch_hori: { output: 'hid_gamepad_switch_hori', mapping: {} },
            },
          ui: (device as any).ui || { layout: {} },
        };

        device.profiles = { [profileId]: profile };
        device.active_profile = profileId;
        delete (device as any).active_mode;
        delete (device as any).modes;
        delete (device as any).ui;
        migrated = true;
      }

      if (!device.profiles || typeof device.profiles !== 'object') {
        return;
      }

      Object.values(device.profiles).forEach((profile) => {
        if (!profile || typeof profile !== 'object') {
          return;
        }

        const hasUiObject = Boolean(profile.ui && typeof profile.ui === 'object');
        const previousLayout = hasUiObject && profile.ui ? profile.ui.layout : undefined;
        const normalizedLayout = this._normalizeLayout(previousLayout);

        const layoutChanged = JSON.stringify(previousLayout || {}) !== JSON.stringify(normalizedLayout);
        if (!hasUiObject || layoutChanged) {
          migrated = true;
        }

        profile.ui = {
          ...(hasUiObject ? profile.ui : {}),
          layout: normalizedLayout,
        };
      });
    });

    if (migrated) {
      this._save();
    }
  }

  private _save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this._data));
    } catch (error) {
      console.error('Failed to save mock config:', error);
    }
  }

  private _ensureDevice(deviceId: string): DeviceConfig {
    if (!this._data) {
      this._data = this._defaultState();
    }

    if (!this._data.devices) {
      this._data.devices = {};
    }

    if (!this._data.devices[deviceId]) {
      this._data.devices[deviceId] = this._defaultDevice(deviceId);
      this._save();
    }

    return this._data.devices[deviceId];
  }
}

export function createMockClient(options?: MockClientOptions): IConfigClient {
  return new MockConfigClient(options);
}

export { MockConfigClient };
export default MockConfigClient;
