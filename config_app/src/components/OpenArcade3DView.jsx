import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MemoizedChildModule } from "./ChildModule.jsx";
import { CameraController } from "./CameraController.jsx";
import { useCameraController } from "../hooks/useCameraController.jsx";
import { useState, useEffect, useLayoutEffect, memo, useRef, useCallback, useMemo } from "react";
import { useGLTF, Bounds } from "@react-three/drei";
import ButtonMappingModal from "./ButtonMappingModal.jsx";
import ButtonMappingsPanel from "./ButtonMappingsPanel.jsx";
import HIDButtonMappingModal from "./HIDButtonMappingModal.jsx";
import D2ConfigPanel from "./D2ConfigPanel.jsx";
import ProfilesPanel from "./ProfilesPanel.jsx";
import LiveInputPanel from "./LiveInputPanel.jsx";
import MockConfigClient from "../services/MockConfigClient.js";
import ControllerHUD from "./ControllerHUD.jsx";
import { DEFAULT_PLATE_ID, getPlateControllerModel } from "../lib/plateCatalog.js";
import * as THREE from "three";
import {
    DEFAULT_LAYOUT,
    HID_INPUT_TYPES,
    getInputForKeycode,
    getInputLabel,
    getKeycodeForInput,
} from "../services/HIDManager.js";

// Shallow equality helper - avoids expensive JSON.stringify
const shallowEqualArrays = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
};

// Preload GLBs with Draco decoding enabled
useGLTF.preload("/TP1_B_0_BUTTON.glb", true);
useGLTF.preload("/TP1_A_0_JOYSTICK.glb", true);
useGLTF.preload("/TP1_A_0_BUTTON.glb", true);

// Camera Setter Component
function CameraSetter({ viewMode, currentModulePosition }) {
    const { camera } = useThree();
    const orthoZoom = 1000;

    useLayoutEffect(() => {
        if (viewMode === '2d') {
            camera.position.set(currentModulePosition[0], 5, currentModulePosition[2]);
            camera.rotation.set(-Math.PI / 2, 0, 0);
            camera.zoom = orthoZoom;
            camera.updateProjectionMatrix();
        } else {
            camera.position.set(0, 1.5, 3);
            camera.rotation.set(0, 0, 0);
            camera.zoom = 1;
            camera.updateProjectionMatrix();
        }
    }, [viewMode, currentModulePosition, camera]);

    return null;
}

// Seeded random generator for stable particle positions
const seededRandom = (seed) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
};

// Minimal Particle System Component
function Particles() {
    const particlesRef = useRef();
    const count = 30;

    const [positions] = useState(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (seededRandom(i * 3) - 0.5) * 20;
            pos[i * 3 + 1] = seededRandom(i * 3 + 1) * 10 - 2;
            pos[i * 3 + 2] = (seededRandom(i * 3 + 2) - 0.5) * 20;
        }
        return pos;
    });

    useFrame((state) => {
        if (particlesRef.current) {
            const positions = particlesRef.current.geometry.attributes.position.array;
            const time = state.clock.elapsedTime;

            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                positions[i3 + 1] += Math.sin(time * 0.3 + i) * 0.002;
                positions[i3] += Math.cos(time * 0.2 + i) * 0.001;
            }

            particlesRef.current.geometry.attributes.position.needsUpdate = true;
        }
    });

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.04}
                color="#7BA3D4"
                transparent
                opacity={0.35}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

// Sidebar nav icon components
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

const LIVE_STATE_POLL_INTERVAL_MS = 120;

const OpenArcade3DView = memo(function OpenArcade3DView({ configClient, onDisconnect }) {
    // ============================================================
    // 1. ALL STATE DECLARATIONS (must be unconditional)
    // ============================================================
    const [selectedButton, setSelectedButton] = useState(null);
    const [activeSection, setActiveSection] = useState("mappings");
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [viewMode, setViewMode] = useState('2d');
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
        { id: "OA-001", name: "Module A", deviceId: "OA-001", path: "/TP1_B_0_BUTTON.glb", mappings: {}, position: [-1.5, 0, 0] },
        { id: "OA-002", name: "Module B", deviceId: "OA-002", path: "/TP1_A_0_JOYSTICK.glb", mappings: {}, position: [0, 0, 0] },
    ]), []);
    
    const [modules, setModules] = useState(defaultModules);
    const [activeProfile, setActiveProfile] = useState(null);
    const [editingMode, setEditingMode] = useState("keyboard");
    const [hasLoaded, setHasLoaded] = useState(false);

    // ============================================================
    // 2. ALL REF DECLARATIONS
    // ============================================================
    const currentModuleDeviceIdRef = useRef(defaultModules[0]?.deviceId || null);
    const previousPressedControlIdsRef = useRef(new Set());
    const livePollInFlightRef = useRef(false);
    const sourceBindingInFlightRef = useRef(false);
    const isVisibleRef = useRef(true);
    const mockClientRef = useRef(null);
    const lastRefreshedIndexRef = useRef(-1);

    // Initialize mock client once
    if (!mockClientRef.current) {
        mockClientRef.current = new MockConfigClient();
    }
    const activeClient = configClient || mockClientRef.current;

    // ============================================================
    // 3. DERIVED VALUES (computed after state, before effects)
    // ============================================================
    const defaultLayout = DEFAULT_LAYOUT;
    const safeCurrentModuleIndex = currentModuleIndex < modules.length ? currentModuleIndex : 0;
    const visibleModules = showOnlyConnected
        ? modules.filter((m) => m.connected !== false)
        : modules;
    const currentModule = modules[safeCurrentModuleIndex] || defaultModules[0];
    const currentMappings = useMemo(
        () => currentModule?.mappingBanks?.[editingMode] || {},
        [currentModule?.mappingBanks, editingMode],
    );
    const cameraControl = useCameraController({ currentModuleIndex: safeCurrentModuleIndex, modules, enabled: viewMode === '3d' });

    // Update deviceId ref (moved to render phase)
    currentModuleDeviceIdRef.current = currentModule?.deviceId || null;

    // ============================================================
    // 4. CALLBACK DECLARATIONS (can use derived values)
    // ============================================================
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
        return defaultLayout[buttonName] ?? null;
    }, [defaultLayout]);

    const getButtonNameForControlId = useCallback((deviceLayout, controlId) => {
        if (controlId == null) {
            return null;
        }

        const normalizedControlId = String(controlId);
        const layout = deviceLayout || defaultLayout;
        const match = Object.entries(layout).find(([, assignedControlId]) => (
            assignedControlId != null && String(assignedControlId) === normalizedControlId
        ));
        return match?.[0] || null;
    }, [defaultLayout]);

    const applyDeviceConfigs = useCallback((devices) => {
        const deviceEntries = Object.entries(devices || {});
        if (deviceEntries.length === 0) {
            return;
        }

        const positions = [[-1.5, 0, 0], [0, 0, 0], [1.5, 0, 0], [3, 0, 0]];
        const entriesToRender = [...deviceEntries].sort(([, leftConfig], [, rightConfig]) => {
            const leftConnected = leftConfig?.connected !== false;
            const rightConnected = rightConfig?.connected !== false;
            if (leftConnected === rightConnected) {
                return 0;
            }
            return leftConnected ? -1 : 1;
        });
        const selectedDeviceId = currentModuleDeviceIdRef.current;

        const nextModules = entriesToRender.map(([deviceId, deviceConfig], index) => {
            const profiles = deviceConfig?.profiles || {};
            const activeProfileId = deviceConfig?.active_profile;
            const deviceActiveProfile = activeProfileId ? profiles[activeProfileId] : null;
            const profileLayout = deviceActiveProfile?.ui?.layout;
            const legacyLayout = deviceConfig?.ui?.layout;
            const resolvedLayout = profileLayout && typeof profileLayout === "object"
                ? profileLayout
                : (legacyLayout && typeof legacyLayout === "object" ? legacyLayout : null);
            const layout = {
                ...defaultLayout,
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
            const plateId = deviceActiveProfile?.plate_id || DEFAULT_PLATE_ID;
            const resolvedPath = getPlateControllerModel(plateId);
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
                path: resolvedPath,
                mappingBanks,
                position: positions[index % positions.length],
                deviceLayout: layout,
                connected: deviceConfig?.connected !== false,
            };
        });

        if (nextModules.length > 0) {
            setModules(nextModules);
            const nextIndex = nextModules.findIndex((module) => module.deviceId === selectedDeviceId);
            setCurrentModuleIndex(nextIndex >= 0 ? nextIndex : 0);

            const selectedEntry = entriesToRender.find(([id]) => id === selectedDeviceId) || entriesToRender[0];
            if (selectedEntry) {
                const [, selectedConfig] = selectedEntry;
                const profMap = selectedConfig?.profiles || {};
                const apId = selectedConfig?.active_profile;
                const nextActiveProfile = apId && profMap[apId] ? profMap[apId] : null;
                setActiveProfile(nextActiveProfile);
                setEditingMode(normalizeEditingMode(nextActiveProfile?.active_mode));
            } else {
                setActiveProfile(null);
                setEditingMode("keyboard");
            }
            return;
        }

        setModules(defaultModules);
        const fallbackIndex = defaultModules.findIndex((module) => module.deviceId === selectedDeviceId);
        setCurrentModuleIndex(fallbackIndex >= 0 ? fallbackIndex : 0);
        setActiveProfile(null);
        setEditingMode("keyboard");
    }, [defaultLayout, defaultModules, normalizeEditingMode]);

    const refreshDevices = useCallback(async () => {
        try {
            const devices = await activeClient.listDevices();
            applyDeviceConfigs(devices);
            setHasLoaded(true);
        } catch (error) {
            console.warn("Failed to load devices:", error);
            setHasLoaded(true);
        }
    }, [activeClient, applyDeviceConfigs]);

    const handleRefreshDevices = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await refreshDevices();
        } catch (error) {
            console.warn("Failed to refresh devices:", error);
        } finally {
            setIsRefreshing(false);
        }
    }, [isRefreshing, refreshDevices]);

    const handleRenameDevice = useCallback(async (deviceId, name) => {
        if (!deviceId || !name?.trim()) return;
        try {
            await activeClient.renameDevice(deviceId, name.trim());
            await refreshDevices();
        } catch (error) {
            console.warn("Failed to rename device:", error);
        }
    }, [activeClient, refreshDevices]);

    const triggerProfileRefresh = useCallback(() => setProfilesRefreshKey((k) => k + 1), []);

    const handleSectionChange = useCallback((section) => {
        setActiveSection(section);
        if (section !== "mappings" || viewMode !== "2d") {
            setIsMappingMode(false);
            setArmedButton(null);
            setMappingStatus(null);
        }
    }, [viewMode]);

    const toggleViewMode = useCallback(() => {
        const newViewMode = viewMode === '3d' ? '2d' : '3d';
        setViewMode(newViewMode);
        if (activeSection !== "mappings" || newViewMode !== "2d") {
            setIsMappingMode(false);
            setArmedButton(null);
            setMappingStatus(null);
        }
    }, [viewMode, activeSection]);

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

    const handleButtonClick = useCallback((buttonName, mesh) => {
        if (viewMode === '2d' && isMappingMode) {
            setSelectedButton(null);
            setArmedButton(buttonName);
            setMappingStatus({
                type: 'info',
                message: `Waiting for a physical input to bind to ${buttonName}.`,
            });
            previousPressedControlIdsRef.current = new Set(pressedControlIds.map((controlId) => String(controlId)));
            return;
        }

        const buttonConfig = currentMappings[buttonName];
        if (buttonConfig && typeof buttonConfig === 'object') {
            setSelectedButton({ name: buttonName, mesh, ...buttonConfig });
        } else {
            setSelectedButton({ name: buttonName, mesh, action: buttonConfig || "" });
        }
    }, [currentMappings, isMappingMode, pressedControlIds, viewMode]);

    const handleModuleClick = useCallback((moduleIndex) => {
        setCurrentModuleIndex(moduleIndex);
        setSelectedButton(null);
        setArmedButton(null);
        setMappingStatus(null);
    }, []);

    const saveMapping = useCallback((buttonName, config) => {
        setModules(prev => prev.map((mod, idx) => {
            if (idx === safeCurrentModuleIndex) {
                const nextBanks = {
                    keyboard: { ...(mod.mappingBanks?.keyboard || {}) },
                    gamepad_pc: { ...(mod.mappingBanks?.gamepad_pc || {}) },
                    gamepad_switch_hori: { ...(mod.mappingBanks?.gamepad_switch_hori || {}) },
                };
                const targetBank = { ...(nextBanks[editingMode] || {}) };

                if (config && (config.type || config.input || config.action)) {
                    targetBank[buttonName] = config;
                } else if (typeof config === 'string') {
                    targetBank[buttonName] = config;
                } else {
                    delete targetBank[buttonName];
                }

                nextBanks[editingMode] = targetBank;
                return { ...mod, mappingBanks: nextBanks };
            }
            return mod;
        }));
        setSelectedButton(null);

        if (!currentModule?.deviceId) {
            return;
        }

        const deviceLayout = currentModule.deviceLayout;
        const controlId = getControlIdForButton(deviceLayout, buttonName);
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

        activeClient.setMapping(currentModule.deviceId, mode, controlId, mappingValue)
            .catch((error) => {
                console.warn("Failed to update mapping:", error);
            });
    }, [safeCurrentModuleIndex, editingMode, currentModule, getControlIdForButton, activeClient]);

    const clearMapping = useCallback((buttonName) => {
        saveMapping(buttonName, null);
    }, [saveMapping]);

    const handleModuleChange = useCallback((index) => {
        setCurrentModuleIndex(index);
        setSelectedButton(null);
        setArmedButton(null);
        setMappingStatus(null);
    }, []);

    const navigatePrev = useCallback(() => {
        setCurrentModuleIndex(prev => {
            const candidates = showOnlyConnected
                ? modules.map((m, i) => i).filter(i => modules[i]?.connected !== false)
                : modules.map((_, i) => i);
            const prevIdx = candidates.filter(i => i < prev).at(-1) ?? prev;
            if (prevIdx !== prev) {
                setSelectedButton(null);
                setArmedButton(null);
                setMappingStatus(null);
            }
            return prevIdx;
        });
    }, [modules, showOnlyConnected]);

    const navigateNext = useCallback(() => {
        setCurrentModuleIndex(prev => {
            const nextIdx = showOnlyConnected
                ? (modules.map((m, i) => i).filter(i => modules[i]?.connected !== false && i > prev)[0] ?? prev)
                : (prev < modules.length - 1 ? prev + 1 : prev);
            if (nextIdx !== prev) {
                setSelectedButton(null);
                setArmedButton(null);
                setMappingStatus(null);
            }
            return nextIdx;
        });
    }, [modules, showOnlyConnected]);

    const clearAllMappings = useCallback(() => {
        setModules(prev => prev.map((mod, idx) => {
            if (idx === safeCurrentModuleIndex) {
                const nextBanks = {
                    keyboard: { ...(mod.mappingBanks?.keyboard || {}) },
                    gamepad_pc: { ...(mod.mappingBanks?.gamepad_pc || {}) },
                    gamepad_switch_hori: { ...(mod.mappingBanks?.gamepad_switch_hori || {}) },
                };
                nextBanks[editingMode] = {};
                return { ...mod, mappingBanks: nextBanks };
            }
            return mod;
        }));
        setSelectedButton(null);
    }, [safeCurrentModuleIndex, editingMode]);

    const saveToDevice = useCallback(async (moduleId) => {
        const module = modules.find(mod => mod.id === moduleId);
        if (module) {
            try {
                const layout = module.deviceLayout || defaultLayout;
                
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
                                await activeClient.setMapping(module.deviceId, "keyboard", controlId, { keycode: keycodeName });
                            }
                        } else if (mapping?.type === HID_INPUT_TYPES.GAMEPAD) {
                            await activeClient.setMapping(module.deviceId, mode, controlId, { gamepad_input: mapping.input });
                        }
                    }
                };

                await saveBank("keyboard", mappingBanks.keyboard);
                await saveBank("gamepad_pc", mappingBanks.gamepad_pc);
                await saveBank("gamepad_switch_hori", mappingBanks.gamepad_switch_hori);

                console.log('Configuration saved successfully!');
            } catch (error) {
                console.error('Failed to save configuration:', error);
            }
        }
    }, [modules, defaultLayout, getControlIdForButton, activeClient]);

    // ============================================================
    // 5. ALL EFFECTS (after all values and callbacks are defined)
    // ============================================================
    
    // Data loading effect
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

    // Refresh when module index changes (after initial load)
    useEffect(() => {
        if (!hasLoaded) return;
        if (safeCurrentModuleIndex === lastRefreshedIndexRef.current) return;
        
        lastRefreshedIndexRef.current = safeCurrentModuleIndex;
        
        let cancelled = false;
        const doRefresh = async () => {
            try {
                const devices = await activeClient.listDevices();
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
    }, [safeCurrentModuleIndex, hasLoaded, activeClient, applyDeviceConfigs]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            setPressedControlIds([]);
            setPressedButtons([]);
            previousPressedControlIdsRef.current = new Set();
            livePollInFlightRef.current = false;
            sourceBindingInFlightRef.current = false;
        };
    }, [configClient]);

    // Page visibility tracking
    useEffect(() => {
        const handleVisibilityChange = () => {
            isVisibleRef.current = !document.hidden;
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Handle showOnlyConnected filter change
    useEffect(() => {
        if (!showOnlyConnected) return;
        
        const currentIsVisible = modules[safeCurrentModuleIndex]?.connected !== false;
        if (!currentIsVisible) {
            const firstVisible = modules.findIndex((m) => m.connected !== false);
            if (firstVisible >= 0 && firstVisible !== safeCurrentModuleIndex) {
                setCurrentModuleIndex(firstVisible);
            }
        }
    }, [showOnlyConnected, modules, safeCurrentModuleIndex]);

    // Arrow key navigation
    useEffect(() => {
        if (viewMode !== '2d' || activeSection !== 'mappings') return;

        const handleKeyDown = (e) => {
            if (selectedButton) return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                navigatePrev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                navigateNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, activeSection, selectedButton, navigatePrev, navigateNext]);

    // Live state polling
    useEffect(() => {
        const currentDeviceId = currentModule?.deviceId;
        const currentLayout = currentModule?.deviceLayout || defaultLayout;

        if (activeSection !== 'mappings' || !currentDeviceId || typeof activeClient.getLiveState !== 'function') {
            return;
        }

        let cancelled = false;

        const syncLiveState = async () => {
            if (livePollInFlightRef.current || !isVisibleRef.current) {
                return;
            }

            livePollInFlightRef.current = true;
            try {
                const liveState = await activeClient.getLiveState(currentDeviceId);
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

                if (!isMappingMode || !armedButton || sourceBindingInFlightRef.current) {
                    return;
                }

                if (newlyPressedControlIds.length > 1) {
                    setMappingStatus({ type: 'error', message: 'Press one physical button at a time.' });
                    return;
                }

                if (newlyPressedControlIds.length !== 1) {
                    return;
                }

                const capturedControlId = newlyPressedControlIds[0];
                const targetButtonName = armedButton;

                sourceBindingInFlightRef.current = true;
                try {
                    await activeClient.setUiBinding(currentDeviceId, targetButtonName, capturedControlId, 'override');
                    await refreshDevices();
                    if (!cancelled) {
                        setArmedButton(null);
                        setMappingStatus({
                            type: 'success',
                            message: `${targetButtonName} now follows physical control ${capturedControlId}; previous owner unbound.`,
                        });
                    }
                } catch {
                    if (!cancelled) {
                        console.warn('Failed to update UI binding');
                        setMappingStatus({
                            type: 'error',
                            message: 'Could not save that source binding. Try again.',
                        });
                    }
                } finally {
                    sourceBindingInFlightRef.current = false;
                }
            } catch {
                if (!cancelled) {
                    setPressedControlIds([]);
                    setPressedButtons([]);
                    if (isMappingMode) {
                        setMappingStatus({
                            type: 'error',
                            message: 'Live input polling is unavailable for this device.',
                        });
                    }
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
    }, [activeClient, activeSection, armedButton, currentModule, defaultLayout, getButtonNameForControlId, isMappingMode, refreshDevices, pressedControlIds]);

    // Preload textures once on mount
    useEffect(() => {
        const dummyTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
        dummyTexture.generateMipmaps = false;
        dummyTexture.needsUpdate = true;

        modules.forEach(module => {
            useGLTF.preload(module.path, true);
        });
    }, []);

    // ============================================================
    // 6. RENDER
    // ============================================================
    const navItems = [
        { id: "mappings", label: "Mappings", Icon: MappingsIcon },
        { id: "profiles", label: "Profiles", Icon: ProfilesIcon },
        { id: "live", label: "Live Input", Icon: LiveInputIcon },
    ];

    const showMappingsView = activeSection === "mappings";
    const hasPrev = showOnlyConnected
        ? modules.slice(0, safeCurrentModuleIndex).some((m) => m.connected !== false)
        : safeCurrentModuleIndex > 0;
    const hasNext = showOnlyConnected
        ? modules.slice(safeCurrentModuleIndex + 1).some((m) => m.connected !== false)
        : safeCurrentModuleIndex < modules.length - 1;

    return (
        <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#D9D9D9] animate-fade-in">
            <ControllerHUD
                controllerName="OpenArcade Controller v1.0"
                moduleCount={modules.length}
                currentModule={safeCurrentModuleIndex}
                modules={modules.map(m => ({ ...m, mappedButtons: Object.keys(m.mappingBanks?.[editingMode] || {}).length }))}
                onModuleChange={handleModuleChange}
                isConnected={modules.some((module) => module.connected !== false)}
                viewMode={viewMode}
                mappingFilter={mappingFilter}
                onMappingFilterChange={setMappingFilter}
                onToggleView={toggleViewMode}
                showOnlyConnected={showOnlyConnected}
                onToggleConnectedFilter={() => setShowOnlyConnected((v) => !v)}
                onRenameDevice={handleRenameDevice}
                onRefreshDevices={handleRefreshDevices}
                isRefreshing={isRefreshing}
            />

            <div className="flex flex-1 min-h-0">
                <div
                    className="w-[72px] bg-[#CCCCCC] flex flex-col items-center pt-5 gap-2 shrink-0"
                    style={{
                        borderRight: '1px solid rgba(0, 0, 0, 0.1)',
                        boxShadow: '1px 0 3px rgba(0, 0, 0, 0.04)'
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
                                    style={{ boxShadow: '2px 0 8px rgba(81, 128, 193, 0.35)' }}
                                />
                            )}
                        </button>
                    ))}

                    <div className="w-8 h-px bg-[#A0A0A0] my-2" />

                    <div className="mt-auto mb-4">
                        <div
                            className="text-[9px] text-[#707070] font-medium tracking-wider text-center leading-tight"
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                            v0.1
                        </div>
                    </div>
                </div>

                {showMappingsView ? (
                    <>
                        <div className="flex-1 relative animate-fade-in">
                            <div
                                className="absolute inset-0 pointer-events-none z-0"
                                style={{
                                    background: `
                                        linear-gradient(rgba(81, 128, 193, 0.04) 1px, transparent 1px),
                                        linear-gradient(90deg, rgba(81, 128, 193, 0.04) 1px, transparent 1px)
                                    `,
                                    backgroundSize: '24px 24px'
                                }}
                            />

                            <Canvas
                                key={viewMode}
                                orthographic={viewMode === '2d'}
                                camera={viewMode === '3d' ? { position: [0, 1.5, 3], fov: 45 } : { position: [0, 5, 0], rotation: [-Math.PI / 2, 0, 0], zoom: 25 }}
                                style={{
                                    background: "linear-gradient(180deg, #D9D9D9 0%, #CCCCCC 100%)",
                                    width: "100%",
                                    height: "100%",
                                    cursor: viewMode === '2d' ? 'pointer' : 'grab'
                                }}
                                shadows
                                gl={{
                                    antialias: true,
                                    shadowMap: {
                                        enabled: true,
                                        type: THREE.PCFSoftShadowMap
                                    }
                                }}
                            >
                                <ambientLight intensity={1.1} color="#FFF8F0" />
                                <directionalLight
                                    position={[5, 12, 8]}
                                    intensity={1.3}
                                    color="#FFFAF5"
                                    castShadow
                                    shadow-mapSize={[2048, 2048]}
                                    shadow-camera-far={50}
                                    shadow-camera-left={-15}
                                    shadow-camera-right={15}
                                    shadow-camera-top={15}
                                    shadow-camera-bottom={-15}
                                    shadow-bias={0.0001}
                                    shadow-radius={3}
                                />
                                <directionalLight
                                    position={[-8, 6, 4]}
                                    intensity={0.4}
                                    color="#E8E0F0"
                                />
                                <directionalLight
                                    position={[0, 3, -10]}
                                    intensity={0.45}
                                    color="#F0E8E0"
                                />
                                <pointLight
                                    position={[3, 4, 3]}
                                    intensity={0.3}
                                    color="#EDE9FE"
                                    distance={15}
                                    decay={2}
                                />
                                <pointLight
                                    position={[-4, 3, -2]}
                                    intensity={0.2}
                                    color="#FEF3E8"
                                    distance={12}
                                    decay={2}
                                />

                                <mesh
                                    rotation={[-Math.PI / 2, 0, 0]}
                                    position={[0, -0.5, 0]}
                                    receiveShadow
                                >
                                    <planeGeometry args={[50, 50]} />
                                    <shadowMaterial opacity={0.08} />
                                </mesh>

                                <gridHelper
                                    args={[40, 40, "#E4E0DC", "#EBE8E4"]}
                                    position={[0, -0.15, 0]}
                                />
                                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]}>
                                    <planeGeometry args={[40, 40, 40, 40]} />
                                    <meshBasicMaterial
                                        color="#D4D0CC"
                                        wireframe
                                        transparent
                                        opacity={0.12}
                                    />
                                </mesh>

                                <Particles />

                                <Bounds clip observe={false} margin={1}>
                                    <CameraSetter viewMode={viewMode} currentModulePosition={currentModule.position} />
                                    {visibleModules.map((module) => {
                                        const globalIndex = modules.indexOf(module);
                                        const isCurrentModule = globalIndex === safeCurrentModuleIndex;
                                        return (
                                            <MemoizedChildModule
                                                path={module.path}
                                                onButtonClick={handleButtonClick}
                                                onModuleClick={() => handleModuleClick(globalIndex)}
                                                isEditable={isCurrentModule}
                                                position={module.position}
                                                viewMode={viewMode}
                                                isActive={isCurrentModule}
                                                mappings={module.mappingBanks?.[editingMode] || {}}
                                                mappingFilter={mappingFilter}
                                                pressedButtons={isCurrentModule ? pressedButtons : []}
                                                armedButton={isCurrentModule ? armedButton : null}
                                                isMappingMode={isCurrentModule ? isMappingMode : false}
                                                key={module.deviceId || module.id}
                                            />
                                        );
                                    })}
                                </Bounds>
                                {viewMode === '3d' && (
                                    <CameraController
                                        targetRef={cameraControl.targetRef}
                                        cameraPositionRef={cameraControl.cameraPositionRef}
                                        animationStart={cameraControl.animationStart}
                                    />
                                )}
                            </Canvas>

                            {viewMode === '2d' && modules.length > 1 && (
                                <>
                                    <button
                                        onClick={navigatePrev}
                                        disabled={!hasPrev}
                                        className={`absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-xl bg-[#CCCCCC]/90 backdrop-blur-sm border border-[#A0A0A0] transition-all duration-200 cursor-pointer ${!hasPrev
                                            ? "opacity-30 cursor-default"
                                            : "hover:bg-[#CCCCCC] hover:border-[#5180C1]/40 hover:shadow-lg active:scale-95"
                                            }`}
                                        style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="15 18 9 12 15 6" />
                                        </svg>
                                    </button>

                                    <button
                                        onClick={navigateNext}
                                        disabled={!hasNext}
                                        className={`absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-xl bg-[#CCCCCC]/90 backdrop-blur-sm border border-[#A0A0A0] transition-all duration-200 cursor-pointer ${!hasNext
                                            ? "opacity-30 cursor-default"
                                            : "hover:bg-[#CCCCCC] hover:border-[#5180C1]/40 hover:shadow-lg active:scale-95"
                                            }`}
                                        style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </button>

                                    <div
                                        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#CCCCCC]/90 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-[#A0A0A0]"
                                        style={{ boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)' }}
                                    >
                                        {visibleModules.map((mod) => {
                                            const globalIndex = modules.indexOf(mod);
                                            return (
                                                <button
                                                    key={mod.deviceId || mod.id}
                                                    onClick={() => handleModuleChange(globalIndex)}
                                                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer border-none ${globalIndex === safeCurrentModuleIndex
                                                        ? "bg-[#5180C1]/15"
                                                        : "bg-transparent hover:bg-[#B8B8B8]"
                                                        }`}
                                                >
                                                    <div className={`w-2 h-2 rounded-full transition-all duration-200 ${globalIndex === safeCurrentModuleIndex
                                                        ? "bg-[#5180C1] scale-110"
                                                        : "bg-[#707070]"
                                                        }`}
                                                        style={globalIndex === safeCurrentModuleIndex ? {
                                                            boxShadow: '0 0 8px rgba(81, 128, 193, 0.5)'
                                                        } : {}}
                                                    />
                                                    <span
                                                        className={`text-xs font-medium whitespace-nowrap transition-colors duration-200 ${globalIndex === safeCurrentModuleIndex ? "text-[#333333]" : "text-[#707070]"
                                                            }`}
                                                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                                                    >
                                                        {mod.name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        {viewMode === '2d' && (
                            <div className="flex flex-col w-[320px] h-full shrink-0">
                                <div className="flex-1 overflow-auto">
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
                                </div>
                            </div>
                        )}
                    </>
                ) : activeSection === "profiles" ? (
                    viewMode === '2d' ? (
                        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                            <ProfilesPanel
                                deviceId={currentModule?.deviceId || null}
                                configClient={activeClient}
                                activeProfile={activeProfile}
                                refreshKey={profilesRefreshKey}
                                onProfileChanged={() => {
                                    triggerProfileRefresh();
                                    refreshDevices();
                                }}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-[#D9D9D9]">
                            <div className="text-center">
                                <p className="text-[#707070] text-sm mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                    Profiles are managed in 2D view
                                </p>
                                <button
                                    onClick={() => toggleViewMode()}
                                    className="px-4 py-2 bg-[#5180C1] text-white rounded-lg text-sm font-medium hover:bg-[#4070B0] transition-colors"
                                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                >
                                    Switch to 2D
                                </button>
                            </div>
                        </div>
                    )
                ) : (
                    viewMode === '2d' ? (
                        <LiveInputPanel />
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-[#D9D9D9]">
                            <div className="text-center">
                                <p className="text-[#707070] text-sm mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                    Live Input is available in 2D view
                                </p>
                                <button
                                    onClick={() => toggleViewMode()}
                                    className="px-4 py-2 bg-[#5180C1] text-white rounded-lg text-sm font-medium hover:bg-[#4070B0] transition-colors"
                                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                >
                                    Switch to 2D
                                </button>
                            </div>
                        </div>
                    )
                )}
            </div>
            
            {selectedButton && (
                viewMode === '3d' ? (
                    <ButtonMappingModal
                        button={selectedButton}
                        onSave={saveMapping}
                        onCancel={() => setSelectedButton(null)}
                        onClear={clearMapping}
                    />
                ) : (
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
                )
            )}
        </div>
    );
});

OpenArcade3DView.displayName = 'OpenArcade3DView';

export { OpenArcade3DView };
