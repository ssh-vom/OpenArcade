import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ControllerHUD from "./components/ControllerHUD";
import D2ConfigPanel from "./components/D2ConfigPanel";
import HIDButtonMappingModal from "./components/HIDButtonMappingModal";
import ProfilesPanel from "./components/ProfilesPanel";
import {
    DEFAULT_LAYOUT,
    HID_INPUT_TYPES,
    getInputForKeycode,
    getInputLabel,
    getKeycodeForInput,
} from "./services/HIDManager";
import { DEFAULT_PLATE_ID, getPlatePreview } from "./lib/plateCatalog";
import type { IConfigClient } from "@/types";


const LIVE_STATE_POLL_INTERVAL_MS = 120;


const shallowEqualArrays = (a, b) => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
};


function MappingsIcon({ active }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={active ? "#5180C1" : "#707070"} strokeWidth="1.75"
            strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="2" />
            <rect x="14" y="3" width="7" height="7" rx="2" />
            <rect x="3" y="14" width="7" height="7" rx="2" />
            <rect x="14" y="14" width="7" height="7" rx="2" />
        </svg>
    );
}

function ProfilesIcon({ active }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={active ? "#5180C1" : "#707070"} strokeWidth="1.75"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
        </svg>
    );
}

function LiveInputIcon({ active }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={active ? "#5180C1" : "#707070"} strokeWidth="1.75"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    );
}


function LiteMappingSurface({
    module,
    currentMappings,
    mappingFilter,
    pressedButtons,
    armedButton,
    isMappingMode,
    onSelectButton,
}) {
    const layout = module?.deviceLayout || DEFAULT_LAYOUT;
    const buttonEntries = Object.keys(layout)
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
        .map((buttonName) => {
            const mapping = currentMappings?.[buttonName] || null;
            return [buttonName, mapping];
        })
        .filter(([, mapping]) => {
            if (mappingFilter === "all") {
                return true;
            }
            return mapping?.type === mappingFilter;
        });

    return (
        <div className="flex-1 min-w-0 min-h-0 flex flex-col p-5 gap-4 overflow-hidden">
            <div
                className="rounded-2xl border border-[#A0A0A0] bg-[#CCCCCC] px-5 py-4 flex items-center gap-4"
                style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
            >
                <img
                    src={getPlatePreview(module?.plateId || DEFAULT_PLATE_ID)}
                    alt="Top plate preview"
                    className="w-24 h-24 object-contain rounded-lg bg-[#D9D9D9] border border-[#B8B8B8]"
                />
                <div className="min-w-0">
                    <h2
                        className="text-lg text-[#333333] font-semibold truncate"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        {module?.name || "OpenArcade"}
                    </h2>
                    <div
                        className="text-xs text-[#707070] mt-1"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        {module?.deviceId || "No device"}
                    </div>
                    <div
                        className="text-xs mt-2"
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            color: module?.connected === false ? "#EF4444" : "#10B981",
                        }}
                    >
                        {module?.connected === false ? "Offline" : "Online"}
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 rounded-2xl border border-[#A0A0A0] bg-[#CCCCCC] p-4 overflow-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {buttonEntries.map(([buttonName, mapping]) => {
                        const isPressed = pressedButtons.includes(buttonName);
                        const isArmed = armedButton === buttonName;

                        return (
                            <button
                                key={buttonName}
                                type="button"
                                onClick={() => onSelectButton(buttonName)}
                                className="rounded-xl text-left px-3 py-3 transition-all duration-150 border"
                                style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    background: isArmed
                                        ? "rgba(74, 144, 164, 0.10)"
                                        : isPressed
                                            ? "rgba(16, 185, 129, 0.10)"
                                            : "#D9D9D9",
                                    borderColor: isArmed
                                        ? "rgba(74, 144, 164, 0.45)"
                                        : isPressed
                                            ? "rgba(16, 185, 129, 0.45)"
                                            : "#B8B8B8",
                                    boxShadow: isArmed || isPressed
                                        ? "0 0 0 2px rgba(81, 128, 193, 0.12)"
                                        : "none",
                                }}
                            >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span
                                        className="text-[11px] uppercase tracking-wide text-[#707070]"
                                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                    >
                                        {buttonName}
                                    </span>
                                    {isMappingMode && isArmed && (
                                        <span
                                            className="text-[9px] px-2 py-0.5 rounded-full"
                                            style={{
                                                background: "rgba(74, 144, 164, 0.15)",
                                                color: "#4A90A4",
                                                fontFamily: "'IBM Plex Mono', monospace",
                                            }}
                                        >
                                            ARMED
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-[#333333] font-medium truncate">
                                    {mapping?.label || "Unmapped"}
                                </div>
                                <div className="text-[11px] text-[#707070] mt-1 truncate">
                                    {mapping?.action || "Tap to map"}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}


function LiveInputLitePanel({ currentModule, pressedControlIds, pressedButtons }) {
    return (
        <div className="flex-1 min-w-0 min-h-0 p-6 overflow-auto">
            <div className="max-w-3xl mx-auto space-y-4">
                <div className="rounded-2xl border border-[#A0A0A0] bg-[#CCCCCC] p-5">
                    <h3
                        className="text-lg text-[#333333] font-semibold"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        Live Input
                    </h3>
                    <p
                        className="text-sm text-[#707070] mt-1"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                        {currentModule?.name || "No module selected"}
                    </p>
                </div>

                <div className="rounded-2xl border border-[#A0A0A0] bg-[#CCCCCC] p-5">
                    <div
                        className="text-xs uppercase tracking-wide text-[#707070] mb-2"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        Pressed UI Buttons
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {pressedButtons.length === 0 ? (
                            <span className="text-sm text-[#707070]">No active buttons</span>
                        ) : (
                            pressedButtons.map((buttonName) => (
                                <span
                                    key={buttonName}
                                    className="px-2.5 py-1 rounded-full text-xs"
                                    style={{
                                        background: "rgba(16, 185, 129, 0.15)",
                                        color: "#10B981",
                                        fontFamily: "'IBM Plex Mono', monospace",
                                    }}
                                >
                                    {buttonName}
                                </span>
                            ))
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-[#A0A0A0] bg-[#CCCCCC] p-5">
                    <div
                        className="text-xs uppercase tracking-wide text-[#707070] mb-2"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        Pressed Physical Control IDs
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {pressedControlIds.length === 0 ? (
                            <span className="text-sm text-[#707070]">No active controls</span>
                        ) : (
                            pressedControlIds.map((controlId) => (
                                <span
                                    key={controlId}
                                    className="px-2.5 py-1 rounded-full text-xs"
                                    style={{
                                        background: "rgba(81, 128, 193, 0.15)",
                                        color: "#5180C1",
                                        fontFamily: "'IBM Plex Mono', monospace",
                                    }}
                                >
                                    {controlId}
                                </span>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


interface OpenArcadeLiteViewProps {
    configClient: IConfigClient;
}

const OpenArcadeLiteView = memo(function OpenArcadeLiteView({ configClient }: OpenArcadeLiteViewProps) {
    const [selectedButton, setSelectedButton] = useState(null);
    const [activeSection, setActiveSection] = useState("mappings");
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [mappingFilter, setMappingFilter] = useState("all");
    const [isMappingMode, setIsMappingMode] = useState(false);
    const [armedButton, setArmedButton] = useState(null);
    const [mappingStatus, setMappingStatus] = useState(null);
    const [pressedControlIds, setPressedControlIds] = useState([]);
    const [pressedButtons, setPressedButtons] = useState([]);
    const [profilesRefreshKey, setProfilesRefreshKey] = useState(0);
    const [showOnlyConnected, setShowOnlyConnected] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const defaultModules = useMemo(() => ([
        {
            id: "OA-001",
            name: "Module A",
            deviceId: "OA-001",
            mappingBanks: {
                keyboard: {},
                gamepad_pc: {},
                gamepad_switch_hori: {},
            },
            deviceLayout: { ...DEFAULT_LAYOUT },
            connected: false,
            plateId: DEFAULT_PLATE_ID,
        },
    ]), []);

    const [modules, setModules] = useState(defaultModules);
    const [activeProfile, setActiveProfile] = useState(null);
    const [editingMode, setEditingMode] = useState("keyboard");
    const [hasLoaded, setHasLoaded] = useState(false);

    const currentModuleDeviceIdRef = useRef(defaultModules[0]?.deviceId || null);
    const previousPressedControlIdsRef = useRef(new Set());
    const livePollInFlightRef = useRef(false);
    const sourceBindingInFlightRef = useRef(false);
    const isVisibleRef = useRef(true);
    const lastRefreshedIndexRef = useRef(-1);

    const safeCurrentModuleIndex = currentModuleIndex < modules.length ? currentModuleIndex : 0;
    const currentModule = modules[safeCurrentModuleIndex] || defaultModules[0];
    const currentMappings = useMemo(
        () => currentModule?.mappingBanks?.[editingMode] || {},
        [currentModule?.mappingBanks, editingMode],
    );

    currentModuleDeviceIdRef.current = currentModule?.deviceId || null;

    const normalizeEditingMode = useCallback((mode) => {
        if (mode === "keyboard" || mode === "gamepad_pc" || mode === "gamepad_switch_hori") {
            return mode;
        }
        if (mode === "gamepad") {
            return "gamepad_pc";
        }
        return "keyboard";
    }, []);

    const preferredInputTypeForMode = useCallback((mode) => (
        mode === "keyboard" ? HID_INPUT_TYPES.KEYBOARD : HID_INPUT_TYPES.GAMEPAD
    ), []);

    const getControlIdForButton = useCallback((deviceLayout, buttonName) => {
        if (deviceLayout && Object.prototype.hasOwnProperty.call(deviceLayout, buttonName)) {
            return deviceLayout[buttonName] ?? null;
        }
        return DEFAULT_LAYOUT[buttonName] ?? null;
    }, []);

    const getButtonNameForControlId = useCallback((deviceLayout, controlId) => {
        if (controlId == null) {
            return null;
        }

        const normalizedControlId = String(controlId);
        const layout = deviceLayout || DEFAULT_LAYOUT;
        const match = Object.entries(layout).find(([, assignedControlId]) => (
            assignedControlId != null && String(assignedControlId) === normalizedControlId
        ));
        return match?.[0] || null;
    }, []);

    const applyDeviceConfigs = useCallback((devices) => {
        const deviceEntries = Object.entries(devices || {});
        if (deviceEntries.length === 0) {
            setModules(defaultModules);
            setCurrentModuleIndex(0);
            setActiveProfile(null);
            setEditingMode("keyboard");
            return;
        }

        const selectedDeviceId = currentModuleDeviceIdRef.current;
        const sortedEntries = [...deviceEntries].sort(([, leftConfig], [, rightConfig]) => {
            const leftConnected = leftConfig?.connected !== false;
            const rightConnected = rightConfig?.connected !== false;
            if (leftConnected === rightConnected) {
                return 0;
            }
            return leftConnected ? -1 : 1;
        });

        const nextModules = sortedEntries.map(([deviceId, deviceConfig]) => {
            const profiles = deviceConfig?.profiles || {};
            const activeProfileId = deviceConfig?.active_profile;
            const deviceActiveProfile = activeProfileId ? profiles[activeProfileId] : null;

            const profileLayout = deviceActiveProfile?.ui?.layout;
            const legacyLayout = deviceConfig?.ui?.layout;
            const resolvedLayout = profileLayout && typeof profileLayout === "object"
                ? profileLayout
                : (legacyLayout && typeof legacyLayout === "object" ? legacyLayout : null);
            const layout = {
                ...DEFAULT_LAYOUT,
                ...(resolvedLayout || {}),
            };

            const profileModes = deviceActiveProfile?.modes || {};
            const keyboardMappingConfig = profileModes?.keyboard?.mapping || {};
            const legacyGamepadMappingConfig = profileModes?.gamepad?.mapping || {};
            const gamepadPcMappingConfig = Object.keys(profileModes?.gamepad_pc?.mapping || {}).length > 0
                ? (profileModes?.gamepad_pc?.mapping || {})
                : legacyGamepadMappingConfig;
            const gamepadSwitchMappingConfig = Object.keys(profileModes?.gamepad_switch_hori?.mapping || {}).length > 0
                ? (profileModes?.gamepad_switch_hori?.mapping || {})
                : legacyGamepadMappingConfig;

            const reverseLayout = Object.entries(layout).reduce((acc, [buttonName, controlId]) => {
                if (controlId == null || controlId === "") {
                    return acc;
                }
                acc[String(controlId)] = buttonName;
                return acc;
            }, {});

            const mappingBanks = {
                keyboard: {},
                gamepad_pc: {},
                gamepad_switch_hori: {},
            };

            const applyMappingConfig = (targetMappings, mappingConfig, type) => {
                Object.entries(mappingConfig).forEach(([controlId, mapping]) => {
                    const buttonName = reverseLayout[String(controlId)];
                    if (!buttonName) return;

                    if (type === HID_INPUT_TYPES.KEYBOARD) {
                        const keycodeName = typeof mapping === "string" ? mapping : mapping?.keycode;
                        const inputValue = getInputForKeycode(keycodeName);
                        if (!inputValue) return;

                        targetMappings[buttonName] = {
                            type: HID_INPUT_TYPES.KEYBOARD,
                            input: inputValue,
                            label: getInputLabel(HID_INPUT_TYPES.KEYBOARD, inputValue),
                            action: keycodeName,
                        };
                        return;
                    }

                    const gamepadInput = typeof mapping === "object" ? mapping?.gamepad_input : null;
                    if (!gamepadInput) return;

                    targetMappings[buttonName] = {
                        type: HID_INPUT_TYPES.GAMEPAD,
                        input: gamepadInput,
                        label: getInputLabel(HID_INPUT_TYPES.GAMEPAD, gamepadInput),
                        action: getInputLabel(HID_INPUT_TYPES.GAMEPAD, gamepadInput),
                    };
                });
            };

            applyMappingConfig(mappingBanks.keyboard, keyboardMappingConfig, HID_INPUT_TYPES.KEYBOARD);
            applyMappingConfig(mappingBanks.gamepad_pc, gamepadPcMappingConfig, HID_INPUT_TYPES.GAMEPAD);
            applyMappingConfig(mappingBanks.gamepad_switch_hori, gamepadSwitchMappingConfig, HID_INPUT_TYPES.GAMEPAD);

            return {
                id: deviceId,
                name: deviceConfig?.name || deviceId,
                deviceId,
                mappingBanks,
                deviceLayout: layout,
                connected: deviceConfig?.connected !== false,
                plateId: deviceActiveProfile?.plate_id || DEFAULT_PLATE_ID,
            };
        });

        setModules(nextModules);
        const nextIndex = nextModules.findIndex((module) => module.deviceId === selectedDeviceId);
        setCurrentModuleIndex(nextIndex >= 0 ? nextIndex : 0);

        const selectedEntry = sortedEntries.find(([id]) => id === selectedDeviceId) || sortedEntries[0];
        if (selectedEntry) {
            const [, selectedConfig] = selectedEntry;
            const profMap = selectedConfig?.profiles || {};
            const activeProfileId = selectedConfig?.active_profile;
            const nextActiveProfile = activeProfileId && profMap[activeProfileId] ? profMap[activeProfileId] : null;
            setActiveProfile(nextActiveProfile);
            setEditingMode(normalizeEditingMode(nextActiveProfile?.active_mode));
        } else {
            setActiveProfile(null);
            setEditingMode("keyboard");
        }
    }, [defaultModules, normalizeEditingMode]);

    const refreshDevices = useCallback(async () => {
        try {
            const devices = await configClient.listDevices();
            applyDeviceConfigs(devices);
            setHasLoaded(true);
        } catch (error) {
            console.warn("Failed to load devices:", error);
            setHasLoaded(true);
        }
    }, [configClient, applyDeviceConfigs]);

    const handleRefreshDevices = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await refreshDevices();
        } finally {
            setIsRefreshing(false);
        }
    }, [isRefreshing, refreshDevices]);

    const handleRenameDevice = useCallback(async (deviceId, name) => {
        if (!deviceId || !name?.trim()) return;
        try {
            await configClient.renameDevice(deviceId, name.trim());
            await refreshDevices();
        } catch (error) {
            console.warn("Failed to rename device:", error);
        }
    }, [configClient, refreshDevices]);

    const triggerProfileRefresh = useCallback(() => setProfilesRefreshKey((value) => value + 1), []);

    const handleSectionChange = useCallback((section) => {
        setActiveSection(section);
        if (section !== "mappings") {
            setIsMappingMode(false);
            setArmedButton(null);
            setMappingStatus(null);
        }
    }, []);

    const toggleMappingMode = useCallback(() => {
        setIsMappingMode((previousValue) => {
            const nextValue = !previousValue;
            setSelectedButton(null);
            setArmedButton(null);
            setMappingStatus(nextValue
                ? { type: "info", message: "Select a UI button, then press its physical source." }
                : null);
            previousPressedControlIdsRef.current = new Set(pressedControlIds.map((controlId) => String(controlId)));
            return nextValue;
        });
    }, [pressedControlIds]);

    const handleButtonClick = useCallback((buttonName) => {
        if (isMappingMode) {
            setSelectedButton(null);
            setArmedButton(buttonName);
            setMappingStatus({
                type: "info",
                message: `Waiting for a physical input to bind to ${buttonName}.`,
            });
            previousPressedControlIdsRef.current = new Set(pressedControlIds.map((controlId) => String(controlId)));
            return;
        }

        const buttonConfig = currentMappings[buttonName];
        if (buttonConfig && typeof buttonConfig === "object") {
            setSelectedButton({ name: buttonName, ...buttonConfig });
        } else {
            setSelectedButton({ name: buttonName, action: buttonConfig || "" });
        }
    }, [currentMappings, isMappingMode, pressedControlIds]);

    const handleModuleChange = useCallback((index) => {
        setCurrentModuleIndex(index);
        setSelectedButton(null);
        setArmedButton(null);
        setMappingStatus(null);
    }, []);

    const saveMapping = useCallback((buttonName, config) => {
        setModules((previousModules) => previousModules.map((module, index) => {
            if (index !== safeCurrentModuleIndex) {
                return module;
            }

            const nextBanks = {
                keyboard: { ...(module.mappingBanks?.keyboard || {}) },
                gamepad_pc: { ...(module.mappingBanks?.gamepad_pc || {}) },
                gamepad_switch_hori: { ...(module.mappingBanks?.gamepad_switch_hori || {}) },
            };
            const targetBank = { ...(nextBanks[editingMode] || {}) };

            if (config && (config.type || config.input || config.action)) {
                targetBank[buttonName] = config;
            } else {
                delete targetBank[buttonName];
            }

            nextBanks[editingMode] = targetBank;
            return { ...module, mappingBanks: nextBanks };
        }));

        setSelectedButton(null);

        if (!currentModule?.deviceId) {
            return;
        }

        const controlId = getControlIdForButton(currentModule.deviceLayout, buttonName);
        if (!controlId || !config) {
            return;
        }

        let mode = editingMode;
        let mappingValue;

        if (config.type === HID_INPUT_TYPES.KEYBOARD) {
            mode = "keyboard";
            const keycodeName = getKeycodeForInput(config.input);
            if (!keycodeName) {
                return;
            }
            mappingValue = { keycode: keycodeName };
        } else if (config.type === HID_INPUT_TYPES.GAMEPAD) {
            mappingValue = { gamepad_input: config.input };
        } else {
            return;
        }

        configClient
            .setMapping(currentModule.deviceId, mode, controlId, mappingValue)
            .catch((error) => {
                console.warn("Failed to update mapping:", error);
            });
    }, [safeCurrentModuleIndex, editingMode, currentModule, getControlIdForButton, configClient]);

    const clearMapping = useCallback((buttonName) => {
        saveMapping(buttonName, null);
    }, [saveMapping]);

    const clearAllMappings = useCallback(() => {
        setModules((previousModules) => previousModules.map((module, index) => {
            if (index !== safeCurrentModuleIndex) {
                return module;
            }

            const nextBanks = {
                keyboard: { ...(module.mappingBanks?.keyboard || {}) },
                gamepad_pc: { ...(module.mappingBanks?.gamepad_pc || {}) },
                gamepad_switch_hori: { ...(module.mappingBanks?.gamepad_switch_hori || {}) },
            };
            nextBanks[editingMode] = {};
            return { ...module, mappingBanks: nextBanks };
        }));
        setSelectedButton(null);
    }, [safeCurrentModuleIndex, editingMode]);

    const saveToDevice = useCallback(async (moduleId) => {
        const module = modules.find((item) => item.id === moduleId);
        if (!module) {
            return;
        }

        const layout = module.deviceLayout || DEFAULT_LAYOUT;
        const mappingBanks = module.mappingBanks || {};

        const saveBank = async (mode, bankMappings) => {
            for (const [buttonName, mapping] of Object.entries(bankMappings || {})) {
                const controlId = getControlIdForButton(layout, buttonName);
                if (!controlId) {
                    continue;
                }

                if (mapping?.type === HID_INPUT_TYPES.KEYBOARD) {
                    const keycodeName = getKeycodeForInput(mapping.input);
                    if (keycodeName) {
                        await configClient.setMapping(module.deviceId, "keyboard", controlId, { keycode: keycodeName });
                    }
                } else if (mapping?.type === HID_INPUT_TYPES.GAMEPAD) {
                    await configClient.setMapping(module.deviceId, mode, controlId, { gamepad_input: mapping.input });
                }
            }
        };

        try {
            await saveBank("keyboard", mappingBanks.keyboard);
            await saveBank("gamepad_pc", mappingBanks.gamepad_pc);
            await saveBank("gamepad_switch_hori", mappingBanks.gamepad_switch_hori);
        } catch (error) {
            console.warn("Failed to save configuration:", error);
        }
    }, [modules, getControlIdForButton, configClient]);

    useEffect(() => {
        let cancelled = false;

        const loadDevices = async () => {
            try {
                if (!cancelled) {
                    await refreshDevices();
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn("Failed to load devices:", error);
                }
            }
        };

        loadDevices();
        return () => {
            cancelled = true;
        };
    }, [refreshDevices]);

    useEffect(() => {
        if (!hasLoaded) return;
        if (safeCurrentModuleIndex === lastRefreshedIndexRef.current) return;

        lastRefreshedIndexRef.current = safeCurrentModuleIndex;

        let cancelled = false;
        const doRefresh = async () => {
            try {
                const devices = await configClient.listDevices();
                if (!cancelled) {
                    applyDeviceConfigs(devices);
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn("Failed to refresh devices:", error);
                }
            }
        };

        doRefresh();
        return () => {
            cancelled = true;
        };
    }, [safeCurrentModuleIndex, hasLoaded, configClient, applyDeviceConfigs]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            isVisibleRef.current = !document.hidden;
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    useEffect(() => {
        if (!showOnlyConnected) return;

        const currentVisible = modules[safeCurrentModuleIndex]?.connected !== false;
        if (!currentVisible) {
            const firstVisible = modules.findIndex((module) => module.connected !== false);
            if (firstVisible >= 0 && firstVisible !== safeCurrentModuleIndex) {
                setCurrentModuleIndex(firstVisible);
            }
        }
    }, [showOnlyConnected, modules, safeCurrentModuleIndex]);

    useEffect(() => {
        const currentDeviceId = currentModule?.deviceId;
        const currentLayout = currentModule?.deviceLayout || DEFAULT_LAYOUT;

        const sectionNeedsLivePolling = activeSection === "mappings" || activeSection === "live";
        if (!sectionNeedsLivePolling || !currentDeviceId || typeof configClient.getLiveState !== "function") {
            return;
        }

        let cancelled = false;

        const syncLiveState = async () => {
            if (livePollInFlightRef.current || !isVisibleRef.current) {
                return;
            }

            livePollInFlightRef.current = true;
            try {
                const liveState = await configClient.getLiveState(currentDeviceId);
                if (cancelled) {
                    return;
                }

                const nextPressedControlIds = (liveState?.pressed_control_ids || []).map((controlId) => String(controlId));
                const nextPressedButtons = nextPressedControlIds
                    .map((controlId) => getButtonNameForControlId(currentLayout, controlId))
                    .filter(Boolean);

                if (!shallowEqualArrays(pressedControlIds, nextPressedControlIds)) {
                    setPressedControlIds(nextPressedControlIds);
                    setPressedButtons(nextPressedButtons);
                }

                const previousPressed = previousPressedControlIdsRef.current;
                const newlyPressedControlIds = nextPressedControlIds.filter((controlId) => !previousPressed.has(controlId));
                previousPressedControlIdsRef.current = new Set(nextPressedControlIds);

                if (activeSection !== "mappings" || !isMappingMode || !armedButton || sourceBindingInFlightRef.current) {
                    return;
                }

                if (newlyPressedControlIds.length > 1) {
                    setMappingStatus({ type: "error", message: "Press one physical button at a time." });
                    return;
                }

                if (newlyPressedControlIds.length !== 1) {
                    return;
                }

                const capturedControlId = newlyPressedControlIds[0];
                const targetButtonName = armedButton;

                sourceBindingInFlightRef.current = true;
                try {
                    await configClient.setUiBinding(currentDeviceId, targetButtonName, capturedControlId, "override");
                    await refreshDevices();
                    if (!cancelled) {
                        setArmedButton(null);
                        setMappingStatus({
                            type: "success",
                            message: `${targetButtonName} now follows physical control ${capturedControlId}.`,
                        });
                    }
                } catch {
                    if (!cancelled) {
                        setMappingStatus({
                            type: "error",
                            message: "Could not save that source binding. Try again.",
                        });
                    }
                } finally {
                    sourceBindingInFlightRef.current = false;
                }
            } catch {
                if (!cancelled) {
                    setPressedControlIds([]);
                    setPressedButtons([]);
                }
            } finally {
                livePollInFlightRef.current = false;
            }
        };

        syncLiveState();
        const intervalId = window.setInterval(syncLiveState, LIVE_STATE_POLL_INTERVAL_MS);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            livePollInFlightRef.current = false;
            previousPressedControlIdsRef.current = new Set();
        };
    }, [
        configClient,
        activeSection,
        currentModule,
        pressedControlIds,
        getButtonNameForControlId,
        isMappingMode,
        armedButton,
        refreshDevices,
    ]);

    const navItems = [
        { id: "mappings", label: "Mappings", Icon: MappingsIcon },
        { id: "profiles", label: "Profiles", Icon: ProfilesIcon },
        { id: "live", label: "Live Input", Icon: LiveInputIcon },
    ];

    return (
        <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#D9D9D9] animate-fade-in">
            <ControllerHUD
                moduleCount={modules.length}
                currentModule={safeCurrentModuleIndex}
                modules={modules.map((module) => ({
                    ...module,
                    mappedButtons: Object.keys(module.mappingBanks?.[editingMode] || {}).length,
                }))}
                onModuleChange={handleModuleChange}
                isConnected={modules.some((module) => module.connected !== false)}
                viewMode="2d"
                mappingFilter={mappingFilter}
                onMappingFilterChange={setMappingFilter}
                onToggleView={() => { }}
                showOnlyConnected={showOnlyConnected}
                onToggleConnectedFilter={() => setShowOnlyConnected((value) => !value)}
                onRenameDevice={handleRenameDevice}
                onRefreshDevices={handleRefreshDevices}
                isRefreshing={isRefreshing}
                showViewToggle={false}
            />

            <div className="flex flex-1 min-h-0">
                <div
                    className="w-[72px] bg-[#CCCCCC] flex flex-col items-center pt-5 gap-2 shrink-0"
                    style={{
                        borderRight: "1px solid rgba(0, 0, 0, 0.1)",
                        boxShadow: "1px 0 3px rgba(0, 0, 0, 0.04)",
                    }}
                >
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleSectionChange(item.id)}
                            className={`group relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer border-none
                                ${activeSection === item.id
                                    ? "bg-[#5180C1]/15"
                                    : "bg-transparent hover:bg-[#B8B8B8]"
                                }`}
                            title={item.label}
                        >
                            <item.Icon active={activeSection === item.id} />
                            {activeSection === item.id && (
                                <div
                                    className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#5180C1] rounded-r-full"
                                    style={{ boxShadow: "2px 0 8px rgba(81, 128, 193, 0.35)" }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {activeSection === "mappings" ? (
                    <>
                        <LiteMappingSurface
                            module={currentModule}
                            currentMappings={currentMappings}
                            mappingFilter={mappingFilter}
                            pressedButtons={pressedButtons}
                            armedButton={armedButton}
                            isMappingMode={isMappingMode}
                            onSelectButton={handleButtonClick}
                        />
                        <D2ConfigPanel
                            mappings={currentMappings}
                            moduleName={currentModule.name}
                            onSelectButton={handleButtonClick}
                            onClearAll={clearAllMappings}
                            moduleId={currentModule.id}
                            onSaveToDevice={saveToDevice}
                            isConnected={currentModule.connected !== false}
                            isMappingMode={isMappingMode}
                            armedButton={armedButton}
                            pressedButtons={pressedButtons}
                            onToggleMappingMode={toggleMappingMode}
                            mappingStatus={mappingStatus}
                            editingMode={editingMode}
                            onEditingModeChange={setEditingMode}
                        />
                    </>
                ) : activeSection === "profiles" ? (
                    <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                        <ProfilesPanel
                            deviceId={currentModule?.deviceId || null}
                            configClient={configClient}
                            activeProfile={activeProfile}
                            refreshKey={profilesRefreshKey}
                            onProfileChanged={() => {
                                triggerProfileRefresh();
                                refreshDevices();
                            }}
                        />
                    </div>
                ) : (
                    <LiveInputLitePanel
                        currentModule={currentModule}
                        pressedControlIds={pressedControlIds}
                        pressedButtons={pressedButtons}
                    />
                )}
            </div>

            {selectedButton && (
                <HIDButtonMappingModal
                    button={selectedButton}
                    preferredInputType={preferredInputTypeForMode(editingMode)}
                    allowedInputTypes={editingMode === "keyboard"
                        ? [HID_INPUT_TYPES.KEYBOARD]
                        : [HID_INPUT_TYPES.GAMEPAD]}
                    onSave={saveMapping}
                    onCancel={() => setSelectedButton(null)}
                    onClear={clearMapping}
                />
            )}
        </div>
    );
});

OpenArcadeLiteView.displayName = "OpenArcadeLiteView";

export default OpenArcadeLiteView;
