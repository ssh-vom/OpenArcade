import { DEFAULT_PLATE_ID } from '@/domain/plate';
import type { Command, CommandResponse, IConfigClient, LiveState, MappingValue } from '@/types';
import type { DeviceConfig, EditingMode, Profile } from '@/types';

export interface HttpClientConfig {
  basePath: string;
}

export class HttpConfigClient implements IConfigClient {
  connected = false;
  private readonly basePath: string;

  constructor(config: Partial<HttpClientConfig> = {}) {
    this.basePath = config.basePath?.replace(/\/+$/, '') ?? '/api';
  }

  async connect(): Promise<void> {
    await this.sendCommand({ cmd: 'ping' });
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  private async sendCommand(command: Command): Promise<CommandResponse> {
    const response = await fetch(`${this.basePath}/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    let payload: CommandResponse;
    try {
      payload = await response.json();
    } catch {
      throw new Error('invalid_json_response');
    }

    if (!response.ok && !payload?.ok) {
      throw new Error(payload?.error || `http_${response.status}`);
    }

    return payload;
  }

  async listDevices(): Promise<Record<string, DeviceConfig>> {
    const response = await this.sendCommand({ cmd: 'list_devices' });
    if (!response.ok) {
      throw new Error(response.error || 'list_devices_failed');
    }

    return (response.devices || {}) as Record<string, DeviceConfig>;
  }

  async getDevice(deviceId: string): Promise<DeviceConfig | null> {
    const response = await this.sendCommand({ cmd: 'get_device', device_id: deviceId });
    if (!response.ok) {
      throw new Error(response.error || 'get_device_failed');
    }

    return (response.device || null) as DeviceConfig | null;
  }

  async getLiveState(deviceId: string): Promise<LiveState | null> {
    const response = await this.sendCommand({ cmd: 'get_live_state', device_id: deviceId });
    if (!response.ok) {
      throw new Error(response.error || 'get_live_state_failed');
    }

    return (response.live_state || null) as LiveState | null;
  }

  async setMapping(
    deviceId: string,
    mode: EditingMode,
    controlId: string,
    mapping: MappingValue,
  ): Promise<CommandResponse> {
    const response = await this.sendCommand({
      cmd: 'set_mapping',
      device_id: deviceId,
      mode,
      control_id: String(controlId),
      mapping,
    });

    if (!response.ok) {
      throw new Error(response.error || `set_mapping_failed:${JSON.stringify(response)}`);
    }

    return response;
  }

  async setUiBinding(
    deviceId: string,
    buttonName: string,
    controlId: string,
    strategy: 'override' | 'swap' = 'override',
  ): Promise<DeviceConfig | null> {
    const response = await this.sendCommand({
      cmd: 'set_ui_binding',
      device_id: deviceId,
      ui_button: buttonName,
      control_id: String(controlId),
      strategy,
    });

    if (!response.ok) {
      throw new Error(response.error || `set_ui_binding_failed:${JSON.stringify(response)}`);
    }

    return (response.device || null) as DeviceConfig | null;
  }

  async setActiveMode(deviceId: string, mode: EditingMode): Promise<CommandResponse> {
    const response = await this.sendCommand({
      cmd: 'set_active_mode',
      device_id: deviceId,
      mode,
    });

    if (!response.ok) {
      throw new Error(response.error || `set_active_mode_failed:${JSON.stringify(response)}`);
    }

    return response;
  }

  async renameDevice(deviceId: string, name: string): Promise<CommandResponse> {
    const response = await this.sendCommand({
      cmd: 'set_device_name',
      device_id: deviceId,
      name,
    });

    if (!response.ok) {
      throw new Error(response.error || 'set_device_name_failed');
    }

    return response;
  }

  async listProfiles(deviceId: string): Promise<Profile[]> {
    const response = await this.sendCommand({
      cmd: 'list_profiles',
      device_id: deviceId,
    });

    if (!response.ok) {
      throw new Error(response.error || `list_profiles_failed:${JSON.stringify(response)}`);
    }

    return (response.profiles || []) as Profile[];
  }

  async createProfile(
    deviceId: string,
    name: string,
    plateId = DEFAULT_PLATE_ID,
  ): Promise<Profile> {
    const response = await this.sendCommand({
      cmd: 'create_profile',
      device_id: deviceId,
      name,
      plate_id: plateId,
    });

    if (!response.ok) {
      throw new Error(response.error || `create_profile_failed:${JSON.stringify(response)}`);
    }

    return response.profile as Profile;
  }

  async deleteProfile(deviceId: string, profileId: string): Promise<CommandResponse> {
    const response = await this.sendCommand({
      cmd: 'delete_profile',
      device_id: deviceId,
      profile_id: profileId,
    });

    if (!response.ok) {
      throw new Error(response.error || `delete_profile_failed:${JSON.stringify(response)}`);
    }

    return response;
  }

  async setActiveProfile(deviceId: string, profileId: string): Promise<DeviceConfig | null> {
    const response = await this.sendCommand({
      cmd: 'set_active_profile',
      device_id: deviceId,
      profile_id: profileId,
    });

    if (!response.ok) {
      throw new Error(response.error || `set_active_profile_failed:${JSON.stringify(response)}`);
    }

    return (response.device || null) as DeviceConfig | null;
  }

  async renameProfile(deviceId: string, profileId: string, name: string): Promise<CommandResponse> {
    const response = await this.sendCommand({
      cmd: 'rename_profile',
      device_id: deviceId,
      profile_id: profileId,
      name,
    });

    if (!response.ok) {
      throw new Error(response.error || `rename_profile_failed:${JSON.stringify(response)}`);
    }

    return response;
  }

  async setProfilePlate(deviceId: string, profileId: string, plateId: string): Promise<CommandResponse> {
    const response = await this.sendCommand({
      cmd: 'set_profile_plate',
      device_id: deviceId,
      profile_id: profileId,
      plate_id: plateId,
    });

    if (!response.ok) {
      throw new Error(response.error || `set_profile_plate_failed:${JSON.stringify(response)}`);
    }

    return response;
  }
}

export default HttpConfigClient;
