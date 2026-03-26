import { DEFAULT_LAYOUT } from "./HIDManager.js";
import { DEFAULT_PLATE_ID } from "../lib/plateCatalog.js";

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

    async setUiBinding(deviceId, buttonName, controlId, strategy = "override") {
        const device = this._ensureDevice(deviceId);
        const profile = this._getActiveProfile(device);
        if (!profile) {
            throw new Error("profile_not_found");
        }

        const layout = this._normalizeLayout(profile.ui?.layout);
        const normalizedControlId = this._normalizeControlId(controlId);
        this._applyLayoutBinding(layout, buttonName, normalizedControlId, strategy);
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

    _normalizeControlId(controlId) {
        if (controlId == null) {
            return null;
        }

        const normalized = String(controlId).trim();
        return normalized.length > 0 ? normalized : null;
    }

    _applyLayoutBinding(layout, buttonName, controlId, strategy = "override") {
        if (typeof buttonName !== "string" || !buttonName) {
            return;
        }

        const previousControlId = layout[buttonName] ?? null;
        let existingButton = null;
        if (controlId != null) {
            existingButton = Object.entries(layout).find(
                ([currentButtonName, assignedControlId]) => (
                    currentButtonName !== buttonName
                    && assignedControlId != null
                    && String(assignedControlId) === controlId
                ),
            )?.[0] || null;
        }

        if (existingButton) {
            if (strategy === "swap") {
                layout[existingButton] = previousControlId;
            } else {
                layout[existingButton] = null;
            }
        }

        layout[buttonName] = controlId;
    }

    _normalizeLayout(layout) {
        const normalizedLayout = {
            ...Object.fromEntries(
                Object.entries(DEFAULT_LAYOUT).map(([buttonName, controlId]) => [
                    buttonName,
                    String(controlId),
                ]),
            ),
        };

        if (!layout || typeof layout !== "object") {
            return normalizedLayout;
        }

        Object.entries(layout).forEach(([buttonName, rawControlId]) => {
            const normalizedControlId = this._normalizeControlId(rawControlId);
            this._applyLayoutBinding(
                normalizedLayout,
                buttonName,
                normalizedControlId,
                "override",
            );
        });

        return normalizedLayout;
    }

    async listProfiles(deviceId) {
        const device = this._ensureDevice(deviceId);
        return deepClone(Object.values(device.profiles || {}));
    }

    async createProfile(deviceId, name, plateId = DEFAULT_PLATE_ID) {
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
                    plate_id: DEFAULT_PLATE_ID,
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
            if (!device) {
                return;
            }

            if (!device.profiles) {
                const profileId = "default-profile";
                const profile = {
                    id: profileId,
                    name: "Default",
                    plate_id: DEFAULT_PLATE_ID,
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
            }

            if (!device.profiles || typeof device.profiles !== "object") {
                return;
            }

            Object.values(device.profiles).forEach((profile) => {
                if (!profile || typeof profile !== "object") {
                    return;
                }

                const hasUiObject = profile.ui && typeof profile.ui === "object";
                const previousLayout = hasUiObject ? profile.ui.layout : undefined;
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
