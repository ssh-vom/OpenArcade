// Device Storage Simulation Service
// Simulates device-local configuration storage using localStorage
// In the future, this will be replaced with actual device communication protocols

class DeviceStorageService {
    constructor() {
        this.storageKey = 'openarcade_device_configs';
        this.mockDeviceId = 'OA-001'; // Simulate current device ID
        this.loadConfigs();
    }

    // Load configurations from localStorage
    loadConfigs() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            this.configs = stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.warn('Failed to load device configs:', error);
            this.configs = {};
        }
    }

    // Save configurations to localStorage
    saveConfigs() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.configs));
        } catch (error) {
            console.error('Failed to save device configs:', error);
        }
    }

    // Get configuration for a specific module
    getModuleConfig(moduleId, deviceId = null) {
        const deviceIdKey = deviceId || this.mockDeviceId;
        return this.configs[deviceIdKey]?.modules?.[moduleId] || {};
    }

    // Save configuration for a specific module
    saveModuleConfig(moduleId, mappings, deviceId = null) {
        const deviceIdKey = deviceId || this.mockDeviceId;
        
        if (!this.configs[deviceIdKey]) {
            this.configs[deviceIdKey] = {
                deviceId: deviceIdKey,
                lastSync: new Date().toISOString(),
                modules: {}
            };
        }

        this.configs[deviceIdKey].modules[moduleId] = {
            mappings,
            lastUpdated: new Date().toISOString()
        };

        this.configs[deviceIdKey].lastSync = new Date().toISOString();
        this.saveConfigs();
    }

    // Clear configuration for a specific module
    clearModuleConfig(moduleId, deviceId = null) {
        const deviceIdKey = deviceId || this.mockDeviceId;
        
        if (this.configs[deviceIdKey]?.modules?.[moduleId]) {
            delete this.configs[deviceIdKey].modules[moduleId];
            this.saveConfigs();
        }
    }

    // Get all configurations for a device
    getDeviceConfigs(deviceId = null) {
        const deviceIdKey = deviceId || this.mockDeviceId;
        return this.configs[deviceIdKey] || null;
    }

    // Import configuration from data
    importConfig(configData, deviceId = null) {
        const deviceIdKey = deviceId || this.mockDeviceId;
        this.configs[deviceIdKey] = {
            ...configData,
            deviceId: deviceIdKey,
            lastSync: new Date().toISOString()
        };
        this.saveConfigs();
    }

    // Export configuration for backup
    exportConfig(deviceId = null) {
        const deviceIdKey = deviceId || this.mockDeviceId;
        return this.configs[deviceIdKey] || null;
    }

    // Simulate sync to device (async operation with delay)
    async syncToDevice(moduleId, deviceId = null) {
        return new Promise((resolve, reject) => {
            // Simulate network/device communication delay
            setTimeout(() => {
                try {
                    const config = this.getModuleConfig(moduleId, deviceId);
                    // In real implementation, this would send config to actual device
                    console.log(`Synced config for module ${moduleId} to device:`, config);
                    resolve({
                        success: true,
                        moduleId,
                        message: 'Configuration synced successfully'
                    });
                } catch (error) {
                    reject({
                        success: false,
                        moduleId,
                        error: error.message
                    });
                }
            }, 800); // Simulate 800ms sync time
        });
    }

    // Get device status
    getDeviceStatus(deviceId = null) {
        const deviceIdKey = deviceId || this.mockDeviceId;
        const config = this.configs[deviceIdKey];
        
        return {
            connected: true, // Simulate always connected for now
            deviceId: deviceIdKey,
            lastSync: config?.lastSync || null,
            modules: Object.keys(config?.modules || {}),
            totalConfigs: Object.keys(config?.modules || {}).length
        };
    }
}

// Export singleton instance
export default new DeviceStorageService();