import { DEFAULT_LAYOUT } from "./HIDManager.js";

const STORAGE_KEY = "openarcade_config";
const DEFAULT_DEVICE_ID = "OA-001";

const deepClone = (value) => JSON.parse(JSON.stringify(value));

class MockConfigClient {
    constructor({ storageKey = STORAGE_KEY, deviceId = DEFAULT_DEVICE_ID } = {}) {
        this.storageKey = storageKey;
        this.deviceId = deviceId;
        this._data = null;
        this._load();
    }

    async connect() {
        return;
    }

    async disconnect() {
        return;
    }

    async listDevices() {
        this._ensureDevice(this.deviceId);
        return deepClone(this._data.devices);
    }

    async getDevice(deviceId) {
        const device = this._data.devices?.[deviceId];
        return device ? deepClone(device) : null;
    }

    async setMapping(deviceId, mode, controlId, mapping) {
        const device = this._ensureDevice(deviceId);
        const modeEntry = device.modes[mode] || { output: null, mapping: {} };
        modeEntry.mapping[String(controlId)] = mapping;
        device.modes[mode] = modeEntry;
        device.last_seen = new Date().toISOString();
        this._save();
        return { ok: true };
    }

    async setActiveMode(deviceId, mode) {
        const device = this._ensureDevice(deviceId);
        device.active_mode = mode;
        device.last_seen = new Date().toISOString();
        this._save();
        return { ok: true };
    }

    _defaultState() {
        return {
            schema_version: 1,
            devices: {},
        };
    }

    _defaultDevice(deviceId) {
        return {
            device_id: deviceId,
            name: `OpenArcade ${deviceId}`,
            last_seen: new Date().toISOString(),
            connected: true,
            descriptor: null,
            active_mode: "keyboard",
            modes: {
                keyboard: { output: "hid_keyboard", mapping: {} },
                gamepad: { output: "hid_gamepad", mapping: {} },
            },
            ui: {
                layout: deepClone(DEFAULT_LAYOUT),
            },
        };
    }

    _load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            this._data = stored ? JSON.parse(stored) : this._defaultState();
        } catch (error) {
            console.warn("Failed to load mock config:", error);
            this._data = this._defaultState();
        }
    }

    _save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this._data));
        } catch (error) {
            console.error("Failed to save mock config:", error);
        }
    }

    _ensureDevice(deviceId) {
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

export default MockConfigClient;
