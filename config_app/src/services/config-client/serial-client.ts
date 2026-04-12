import { ERROR_NAMES } from '@/constants';
import { DEFAULT_PLATE_ID } from '@/domain/plate';
import type {
  Command,
  CommandResponse,
  DeviceConfig,
  EditingMode,
  IConfigClient,
  LiveState,
  MappingValue,
  Profile,
} from '@/types';

interface PendingRequest {
  resolve: (value: CommandResponse) => void;
  reject: (reason?: unknown) => void;
}

export class PortInUseError extends Error {
  readonly name = ERROR_NAMES.PORT_IN_USE;

  constructor(readonly originalError: unknown) {
    super('Serial port already open in another tab');
  }
}

export class UserCancelledError extends Error {
  readonly name = ERROR_NAMES.USER_CANCELLED;

  constructor() {
    super('No device selected');
  }
}

export class SerialConfigClient implements IConfigClient {
  connected = false;

  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private buffer = '';
  private pending: PendingRequest[] = [];
  private _queue: Promise<unknown> = Promise.resolve();
  private _readLoopRunning = false;

  async connect(): Promise<void> {
    if (!("serial" in navigator)) {
      throw new Error('WebSerial not supported in this browser');
    }

    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate: 115200 });
    } catch (err: any) {
      const errorMessage = err?.message || '';
      const isPortInUse =
        err?.name === 'InvalidStateError' ||
        errorMessage.includes('already open') ||
        errorMessage.includes('in use') ||
        errorMessage.includes('Access denied') ||
        errorMessage.includes('exclusive lock') ||
        errorMessage.includes('Failed to open serial port') ||
        errorMessage.includes('The port is already open') ||
        errorMessage.includes('The device is already in use');

      if (isPortInUse) {
        throw new PortInUseError(err);
      }

      if (err?.name === 'NotFoundError' || errorMessage.includes('No port selected')) {
        throw new UserCancelledError();
      }

      throw err;
    }

    const decoder = new TextDecoderStream();
    this.port.readable.pipeTo(decoder.writable);
    this.reader = decoder.readable.getReader();

    this.writer = this.port.writable.getWriter();
    this.connected = true;
    this._startReadLoop();
  }

  async disconnect(): Promise<void> {
    this.connected = false;

    while (this.pending.length > 0) {
      const request = this.pending.shift();
      request?.reject(new Error('serial_disconnected'));
    }

    if (this.reader) {
      await this.reader.cancel();
      this.reader.releaseLock();
      this.reader = null;
    }

    if (this.writer) {
      this.writer.releaseLock();
      this.writer = null;
    }

    if (this.port) {
      await this.port.close();
      this.port = null;
    }
  }

  async sendCommand(command: Command): Promise<CommandResponse> {
    const task = async (): Promise<CommandResponse> => {
      if (!this.connected || !this.writer) {
        throw new Error('Serial port not connected');
      }

      const payload = `${JSON.stringify(command)}\n`;
      let pendingResolve: (value: CommandResponse) => void = () => {};
      let pendingReject: (reason?: unknown) => void = () => {};
      const pendingPromise = new Promise<CommandResponse>((resolve, reject) => {
        pendingResolve = resolve;
        pendingReject = reject;
      });

      const pending = { resolve: pendingResolve, reject: pendingReject };
      this.pending.push(pending);

      try {
        await this.writer.write(new TextEncoder().encode(payload));
      } catch (error) {
        const index = this.pending.indexOf(pending);
        if (index !== -1) {
          this.pending.splice(index, 1);
        }

        throw error;
      }

      return pendingPromise;
    };

    this._queue = this._queue.then(task, task);
    return this._queue as Promise<CommandResponse>;
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

  private _startReadLoop(): void {
    if (this._readLoopRunning || !this.reader) {
      return;
    }

    this._readLoopRunning = true;
    this._readLoop().catch((error) => {
      while (this.pending.length > 0) {
        const request = this.pending.shift();
        request?.reject(error);
      }
    });
  }

  private async _readLoop(): Promise<void> {
    while (this.connected && this.reader) {
      const { value, done } = await this.reader.read();
      if (done) {
        break;
      }

      if (value) {
        this.buffer += value;
        this._flushBuffer();
      }
    }

    this._readLoopRunning = false;
  }

  private _flushBuffer(): void {
    let newlineIndex = this.buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (line) {
        this._handleLine(line);
      }

      newlineIndex = this.buffer.indexOf('\n');
    }
  }

  private _handleLine(line: string): void {
    let message: CommandResponse | null = null;

    try {
      message = JSON.parse(line);
    } catch {
      this._resolvePending({ ok: false, error: 'invalid_json' });
      return;
    }

    if (typeof message?.ok !== 'boolean') {
      return;
    }

    this._resolvePending(message);
  }

  private _resolvePending(message: CommandResponse): void {
    const pending = this.pending.shift();
    if (!pending) {
      return;
    }

    if (message.ok) {
      pending.resolve(message);
    } else {
      pending.resolve({ ...message, error: message.error || 'request_failed' });
    }
  }
}

export default SerialConfigClient;
