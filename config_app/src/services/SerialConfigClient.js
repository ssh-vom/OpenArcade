export default class SerialConfigClient {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.buffer = "";
        this.pending = [];
        this.connected = false;
        this._readLoopRunning = false;
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
        if (!this.connected || !this.writer) {
            throw new Error("Serial port not connected");
        }
        const payload = `${JSON.stringify(command)}\n`;
        await this.writer.write(new TextEncoder().encode(payload));

        return new Promise((resolve, reject) => {
            this.pending.push({ resolve, reject });
        });
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

    async setMapping(deviceId, mode, controlId, mapping) {
        const response = await this.sendCommand({
            cmd: "set_mapping",
            device_id: deviceId,
            mode,
            control_id: String(controlId),
            mapping,
        });
        if (!response.ok) {
            throw new Error(response.error || "set_mapping_failed");
        }
        return response;
    }

    async setActiveMode(deviceId, mode) {
        const response = await this.sendCommand({
            cmd: "set_active_mode",
            device_id: deviceId,
            mode,
        });
        if (!response.ok) {
            throw new Error(response.error || "set_active_mode_failed");
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
        } catch (error) {
            this._resolvePending({ ok: false, error: "invalid_json" });
            return;
        }

        this._resolvePending(message);
    }

    _resolvePending(message) {
        const pending = this.pending.shift();
        if (pending) {
            pending.resolve(message);
        }
    }
}
