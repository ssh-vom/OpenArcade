import { DEFAULT_LAYOUT } from '@/domain/hid';
import { DEFAULT_PLATE_ID } from '@/domain/plate';
import type { DeviceConfig, EditingMode, IConfigClient, LiveState, MappingValue, Profile } from '@/types';

const DEFAULT_DEVICE_ID = 'OA-001';

function defaultDevice(id: string): DeviceConfig {
  return {
    device_id: id,
    name: `OpenArcade ${id}`,
    connected: true,
    active_profile: 'default',
    profiles: {
      default: {
        id: 'default',
        name: 'Default',
        plate_id: DEFAULT_PLATE_ID,
        active_mode: 'keyboard',
        modes: {
          keyboard: { output: 'hid_keyboard', mapping: {} },
          gamepad: { output: 'hid_gamepad', mapping: {} },
          gamepad_pc: { output: 'hid_gamepad_pc', mapping: {} },
          gamepad_switch_hori: { output: 'hid_gamepad_switch_hori', mapping: {} },
        },
        ui: { layout: { ...DEFAULT_LAYOUT } },
      },
    },
    descriptor: null,
    last_seen: new Date().toISOString(),
  } as DeviceConfig;
}

export class MockConfigClient implements IConfigClient {
  connected = false;
  private devices: Record<string, DeviceConfig> = {};

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async listDevices(): Promise<Record<string, DeviceConfig>> {
    this.ensureDevice(DEFAULT_DEVICE_ID);
    return { ...this.devices };
  }

  async getDevice(deviceId: string): Promise<DeviceConfig | null> {
    this.ensureDevice(deviceId);
    return this.devices[deviceId] ? { ...this.devices[deviceId] } : null;
  }

  async getLiveState(_deviceId: string): Promise<LiveState | null> {
    return { device_id: _deviceId, connected: true, raw_state: 0, pressed_bits: [], pressed_control_ids: [], seq: 0, updated_at: null };
  }

  async setMapping(deviceId: string, mode: EditingMode, controlId: string, mapping: MappingValue): Promise<{ ok: true }> {
    const device = this.ensureDevice(deviceId);
    const profile = this.getActiveProfile(device);
    if (!profile) throw new Error('profile_not_found');
    const entry = profile.modes[mode] || { output: null, mapping: {} };
    entry.mapping[String(controlId)] = mapping;
    profile.modes[mode] = entry;
    return { ok: true };
  }

  async setUiBinding(deviceId: string, buttonName: string, controlId: string): Promise<DeviceConfig | null> {
    const device = this.ensureDevice(deviceId);
    const profile = this.getActiveProfile(device);
    if (!profile) throw new Error('profile_not_found');
    const layout = profile.ui?.layout || {};
    layout[buttonName] = controlId;
    return { ...device };
  }

  async setActiveMode(deviceId: string, mode: EditingMode): Promise<{ ok: true }> {
    const profile = this.getActiveProfile(this.ensureDevice(deviceId));
    if (!profile) throw new Error('profile_not_found');
    profile.active_mode = mode;
    return { ok: true };
  }

  async renameDevice(deviceId: string, name: string): Promise<{ ok: true }> {
    this.ensureDevice(deviceId).name = name.trim();
    return { ok: true };
  }

  async listProfiles(deviceId: string): Promise<Profile[]> {
    const device = this.ensureDevice(deviceId);
    return Object.values(device.profiles || {});
  }

  async createProfile(deviceId: string, name: string, plateId = DEFAULT_PLATE_ID): Promise<Profile> {
    const device = this.ensureDevice(deviceId);
    const id = `profile-${Date.now()}`;
    const active = this.getActiveProfile(device);
    const profile: Profile = {
      id,
      name,
      plate_id: plateId,
      active_mode: active?.active_mode || 'keyboard',
      modes: { ...(active?.modes || {
        keyboard: { output: 'hid_keyboard', mapping: {} },
        gamepad: { output: 'hid_gamepad', mapping: {} },
        gamepad_pc: { output: 'hid_gamepad_pc', mapping: {} },
        gamepad_switch_hori: { output: 'hid_gamepad_switch_hori', mapping: {} },
      })},
      ui: { layout: { ...(active?.ui?.layout || DEFAULT_LAYOUT) } },
    };
    device.profiles[id] = profile;
    return { ...profile };
  }

  async deleteProfile(deviceId: string, profileId: string): Promise<{ ok: true }> {
    const device = this.ensureDevice(deviceId);
    const profiles = device.profiles || {};
    if (Object.keys(profiles).length <= 1) throw new Error('cannot_delete_only_profile');
    if (device.active_profile === profileId) throw new Error('cannot_delete_active_profile');
    delete profiles[profileId];
    return { ok: true };
  }

  async setActiveProfile(deviceId: string, profileId: string): Promise<DeviceConfig | null> {
    const device = this.ensureDevice(deviceId);
    if (!device.profiles?.[profileId]) throw new Error('profile_not_found');
    device.active_profile = profileId;
    return { ...device };
  }

  async renameProfile(deviceId: string, profileId: string, name: string): Promise<{ ok: true }> {
    const device = this.ensureDevice(deviceId);
    const profile = device.profiles?.[profileId];
    if (!profile) throw new Error('profile_not_found');
    profile.name = name;
    return { ok: true };
  }

  async setProfilePlate(deviceId: string, profileId: string, plateId: string): Promise<{ ok: true }> {
    const profile = this.ensureDevice(deviceId).profiles?.[profileId];
    if (!profile) throw new Error('profile_not_found');
    profile.plate_id = plateId;
    return { ok: true };
  }

  private getActiveProfile(device: DeviceConfig): Profile | null {
    return (device.profiles?.[device.active_profile || ''] as Profile) || null;
  }

  private ensureDevice(deviceId: string): DeviceConfig {
    if (!this.devices[deviceId]) {
      this.devices[deviceId] = defaultDevice(deviceId);
    }
    return this.devices[deviceId];
  }
}

export { MockConfigClient as default };
