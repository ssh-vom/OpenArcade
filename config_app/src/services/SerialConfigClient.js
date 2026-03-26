import { DEFAULT_PLATE_ID } from "../lib/plateCatalog.js";

export default class SerialConfigClient {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.buffer = "";
        this.pending = [];
        this.connected = false;
        this._readLoopRunning = false;
        this._queue = Promise.resolve();
    }

    async connect() {
        if (!("serial" in navigator)) {
            throw new Error("WebSerial not supported in this browser");
        }

        this.port = await navigator.serial.requestPort();
        await this.port.open({ baudRate: 115200 });

        const decoder = new TextDecoderStream();
        this.port.readable.pipeTo(decoder.writable);
        this.reader = decoder.readable.getReader();

        this.writer = this.port.writable.getWriter();
        this.connected = true;
        this._startReadLoop();
    }

    async disconnect() {
        this.connected = false;
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

    async sendCommand(command) {
        const task = async () => {
            if (!this.connected || !this.writer) {
                throw new Error("Serial port not connected");
            }
            const payload = `${JSON.stringify(command)}\n`;
            let pendingResolve;
            let pendingReject;
            const pendingPromise = new Promise((resolve, reject) => {
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
        return this._queue;
    }

    async listDevices() {
        const response = await this.sendCommand({ cmd: "list_devices" });
        if (!response.ok) {
            throw new Error(response.error || "list_devices_failed");
        }
        return response.devices || {};
    }

    async getDevice(deviceId) {
        const response = await this.sendCommand({ cmd: "get_device", device_id: deviceId });
        if (!response.ok) {
            throw new Error(response.error || "get_device_failed");
        }
        return response.device;
    }

    async getLiveState(deviceId) {
        const response = await this.sendCommand({ cmd: "get_live_state", device_id: deviceId });
        if (!response.ok) {
            throw new Error(response.error || "get_live_state_failed");
        }
        return response.live_state || null;
    }

    async setMapping(deviceId, mode, controlId, mapping) {
        const response = await this.sendCommand({
            cmd: "set_mapping",
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

    async setUiBinding(deviceId, buttonName, controlId, strategy = "override") {
        const response = await this.sendCommand({
            cmd: "set_ui_binding",
            device_id: deviceId,
            ui_button: buttonName,
            control_id: String(controlId),
            strategy,
        });
        if (!response.ok) {
            throw new Error(response.error || `set_ui_binding_failed:${JSON.stringify(response)}`);
        }
        return response.device || null;
    }

    async setActiveMode(deviceId, mode) {
        const response = await this.sendCommand({
            cmd: "set_active_mode",
            device_id: deviceId,
            mode,
        });
        if (!response.ok) {
            throw new Error(response.error || `set_active_mode_failed:${JSON.stringify(response)}`);
        }
        return response;
    }

    async renameDevice(deviceId, name) {
        const response = await this.sendCommand({
            cmd: "set_device_name",
            device_id: deviceId,
            name,
        });
        if (!response.ok) {
            throw new Error(response.error || "set_device_name_failed");
        }
        return response;
    }

    async listProfiles(deviceId) {
        const response = await this.sendCommand({
            cmd: "list_profiles",
            device_id: deviceId,
        });
        if (!response.ok) {
            throw new Error(response.error || `list_profiles_failed:${JSON.stringify(response)}`);
        }
        return response.profiles || [];
    }

    async createProfile(deviceId, name, plateId = DEFAULT_PLATE_ID) {
        const response = await this.sendCommand({
            cmd: "create_profile",
            device_id: deviceId,
            name,
            plate_id: plateId,
        });
        if (!response.ok) {
            throw new Error(response.error || `create_profile_failed:${JSON.stringify(response)}`);
        }
        return response.profile;
    }

    async deleteProfile(deviceId, profileId) {
        const response = await this.sendCommand({
            cmd: "delete_profile",
            device_id: deviceId,
            profile_id: profileId,
        });
        if (!response.ok) {
            throw new Error(response.error || `delete_profile_failed:${JSON.stringify(response)}`);
        }
        return response;
    }

    async setActiveProfile(deviceId, profileId) {
        const response = await this.sendCommand({
            cmd: "set_active_profile",
            device_id: deviceId,
            profile_id: profileId,
        });
        if (!response.ok) {
            throw new Error(response.error || `set_active_profile_failed:${JSON.stringify(response)}`);
        }
        return response.device || null;
    }

    async renameProfile(deviceId, profileId, name) {
        const response = await this.sendCommand({
            cmd: "rename_profile",
            device_id: deviceId,
            profile_id: profileId,
            name,
        });
        if (!response.ok) {
            throw new Error(response.error || `rename_profile_failed:${JSON.stringify(response)}`);
        }
        return response;
    }

    async setProfilePlate(deviceId, profileId, plateId) {
        const response = await this.sendCommand({
            cmd: "set_profile_plate",
            device_id: deviceId,
            profile_id: profileId,
            plate_id: plateId,
        });
        if (!response.ok) {
            throw new Error(response.error || `set_profile_plate_failed:${JSON.stringify(response)}`);
        }
        return response;
    }

    _startReadLoop() {
        if (this._readLoopRunning || !this.reader) {
            return;
        }
        this._readLoopRunning = true;
        this._readLoop();
    }

    async _readLoop() {
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

    _flushBuffer() {
        let newlineIndex = this.buffer.indexOf("\n");
        while (newlineIndex !== -1) {
            const line = this.buffer.slice(0, newlineIndex).trim();
            this.buffer = this.buffer.slice(newlineIndex + 1);
            if (line) {
                this._handleLine(line);
            }
            newlineIndex = this.buffer.indexOf("\n");
        }
    }

    _handleLine(line) {
        let message = null;
        try {
            message = JSON.parse(line);
        } catch {
            this._resolvePending({ ok: false, error: "invalid_json" });
            return;
        }

        if (typeof message.ok !== "boolean") {
            return;
        }

        this._resolvePending(message);
    }

    _resolvePending(message) {
        const pending = this.pending.shift();
        if (!pending) {
            return;
        }
        if (message.ok) {
            pending.resolve(message);
        } else {
            const error = message.error || "request_failed";
            pending.resolve({ ...message, error });
        }
    }
}
