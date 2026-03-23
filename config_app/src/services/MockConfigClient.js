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

    async getLiveState(deviceId) {
        const device = this._data.devices?.[deviceId];
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

    async setMapping(deviceId, mode, controlId, mapping) {
        const device = this._ensureDevice(deviceId);
        const profile = this._getActiveProfile(device);
        if (!profile) {
            throw new Error("profile_not_found");
        }

        const modeEntry = profile.modes?.[mode] || { output: null, mapping: {} };
        modeEntry.mapping[String(controlId)] = mapping;
        profile.modes = profile.modes || {};
        profile.modes[mode] = modeEntry;

        device.last_seen = new Date().toISOString();
        this._save();
        return { ok: true };
    }

    async setUiBinding(deviceId, buttonName, controlId, strategy = "swap") {
        const device = this._ensureDevice(deviceId);
        const profile = this._getActiveProfile(device);
        if (!profile) {
            throw new Error("profile_not_found");
        }

        const layout = profile.ui?.layout || {};
        const normalizedControlId = String(controlId);
        const previousControlId = layout[buttonName];

        const existingButton = Object.entries(layout).find(
            ([currentButtonName, assignedControlId]) =>
                currentButtonName !== buttonName && String(assignedControlId) === normalizedControlId,
        )?.[0];

        if (existingButton) {
            if (strategy === "swap" && previousControlId != null) {
                layout[existingButton] = previousControlId;
            } else {
                delete layout[existingButton];
            }
        }

        layout[buttonName] = normalizedControlId;
        profile.ui = {
            ...profile.ui,
            layout,
        };

        device.last_seen = new Date().toISOString();
        this._save();
        return deepClone(device);
    }

    async setActiveMode(deviceId, mode) {
        const device = this._ensureDevice(deviceId);
        const profile = this._getActiveProfile(device);
        if (!profile) {
            throw new Error("profile_not_found");
        }

        profile.active_mode = mode;
        device.last_seen = new Date().toISOString();
        this._save();
        return { ok: true };
    }

    async renameDevice(deviceId, name) {
        const device = this._ensureDevice(deviceId);
        device.name = name.trim();
        device.last_seen = new Date().toISOString();
        this._save();
        return { ok: true };
    }

    _getActiveProfile(device) {
        return device?.profiles?.[device.active_profile] || null;
    }

    async listProfiles(deviceId) {
        const device = this._ensureDevice(deviceId);
        return deepClone(Object.values(device.profiles || {}));
    }

    async createProfile(deviceId, name, plateId = "button-module-v1") {
        const device = this._ensureDevice(deviceId);
        const id = `profile-${Date.now()}`;
        const activeProfile = this._getActiveProfile(device) || {};
        const newProfile = {
            id,
            name,
            plate_id: plateId,
            active_mode: activeProfile.active_mode || "keyboard",
            modes: deepClone(
                activeProfile.modes || {
                    keyboard: { output: "hid_keyboard", mapping: {} },
                    gamepad: { output: "hid_gamepad", mapping: {} },
                },
            ),
            ui: { layout: deepClone(activeProfile.ui?.layout || {}) },
        };

        device.profiles[id] = newProfile;
        this._save();
        return deepClone(newProfile);
    }

    async deleteProfile(deviceId, profileId) {
        const device = this._ensureDevice(deviceId);
        const profiles = device.profiles || {};

        if (Object.keys(profiles).length <= 1) {
            throw new Error("cannot_delete_only_profile");
        }
        if (device.active_profile === profileId) {
            throw new Error("cannot_delete_active_profile");
        }

        delete profiles[profileId];
        this._save();
        return { ok: true };
    }

    async setActiveProfile(deviceId, profileId) {
        const device = this._ensureDevice(deviceId);

        if (!device.profiles?.[profileId]) {
            throw new Error("profile_not_found");
        }

        device.active_profile = profileId;
        device.last_seen = new Date().toISOString();
        this._save();
        return deepClone(device);
    }

    async renameProfile(deviceId, profileId, name) {
        const device = this._ensureDevice(deviceId);

        if (!device.profiles?.[profileId]) {
            throw new Error("profile_not_found");
        }

        device.profiles[profileId].name = name;
        this._save();
        return { ok: true };
    }

    async setProfilePlate(deviceId, profileId, plateId) {
        const device = this._ensureDevice(deviceId);

        if (!device.profiles?.[profileId]) {
            throw new Error("profile_not_found");
        }

        device.profiles[profileId].plate_id = plateId;
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
            active_profile: "default-profile",
            profiles: {
                "default-profile": {
                    id: "default-profile",
                    name: "Default",
                    plate_id: "button-module-v1",
                    active_mode: "keyboard",
                    modes: {
                        keyboard: { output: "hid_keyboard", mapping: {} },
                        gamepad: { output: "hid_gamepad", mapping: {} },
                    },
                    ui: {
                        layout: deepClone(DEFAULT_LAYOUT),
                    },
                },
            },
        };
    }

    _load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            this._data = stored ? JSON.parse(stored) : this._defaultState();
            this._migrateData();
        } catch (error) {
            console.warn("Failed to load mock config:", error);
            this._data = this._defaultState();
        }
    }

    _migrateData() {
        if (!this._data?.devices) {
            return;
        }

        let migrated = false;

        Object.values(this._data.devices).forEach((device) => {
            if (!device || device.profiles) {
                return;
            }

            const profileId = "default-profile";
            const profile = {
                id: profileId,
                name: "Default",
                plate_id: "button-module-v1",
                active_mode: device.active_mode || "keyboard",
                modes:
                    device.modes || {
                        keyboard: { output: "hid_keyboard", mapping: {} },
                        gamepad: { output: "hid_gamepad", mapping: {} },
                    },
                ui: device.ui || { layout: {} },
            };

            device.profiles = { [profileId]: profile };
            device.active_profile = profileId;
            delete device.active_mode;
            delete device.modes;
            delete device.ui;
            migrated = true;
        });

        if (migrated) {
            this._save();
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
