import { DEFAULT_PLATE_ID } from "../lib/plateCatalog.js";

export default class HttpConfigClient {
    constructor({ basePath = "/api" } = {}) {
        this.basePath = basePath.replace(/\/+$/, "");
        this.connected = false;
    }

    async connect() {
        await this.sendCommand({ cmd: "ping" });
        this.connected = true;
    }

    async disconnect() {
        this.connected = false;
    }

    async sendCommand(command) {
        const response = await fetch(`${this.basePath}/command`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(command),
        });

        let payload;
        try {
            payload = await response.json();
        } catch {
            throw new Error("invalid_json_response");
        }

        if (!response.ok && !payload?.ok) {
            throw new Error(payload?.error || `http_${response.status}`);
        }

        return payload;
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
}
