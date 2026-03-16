import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MemoizedChildModule } from "./ChildModule.jsx";
import { CameraController } from "./CameraController.jsx";
import { useCameraController } from "../hooks/useCameraController.jsx";
import { useState, useEffect, memo, useRef, useCallback, useMemo } from "react";
import { useGLTF, Bounds } from "@react-three/drei";
import ButtonMappingModal from "./ButtonMappingModal.jsx";
import ButtonMappingsPanel from "./ButtonMappingsPanel.jsx";
import HIDButtonMappingModal from "./HIDButtonMappingModal.jsx";
import D2ConfigPanel from "./D2ConfigPanel.jsx";
import ProfilesPanel from "./ProfilesPanel.jsx";
import LiveInputPanel from "./LiveInputPanel.jsx";
import MockConfigClient from "../services/MockConfigClient.js";
import ControllerHUD from "./ControllerHUD.jsx";
import * as THREE from "three";
import {
    DEFAULT_LAYOUT,
    HID_INPUT_TYPES,
    getInputForKeycode,
    getInputLabel,
    getKeycodeForInput,
} from "../services/HIDManager.js";

// Preload GLBs with texture generation
useGLTF.preload("/OpenArcadeAssy_v2.glb");
useGLTF.preload("/RevFinalJoystickModule_2026-03-15.glb");


// Camera Setter Component
function CameraSetter({ viewMode, currentModulePosition }) {
    const { camera } = useThree();
    const orthoZoom = 1000;

    useEffect(() => {
        if (viewMode === '2d') {
            // Position camera above the current module in 2D mode
            camera.position.set(currentModulePosition[0], 5, currentModulePosition[2]);
            camera.rotation.set(-Math.PI / 2, 0, 0);
            camera.zoom = orthoZoom;
            camera.updateProjectionMatrix();
        } else {
            // Reset to 3D view
            camera.position.set(0, 1.5, 3);
            camera.rotation.set(0, 0, 0);
            camera.zoom = 1;
            camera.updateProjectionMatrix();
        }
    }, [viewMode, currentModulePosition, camera]);

    return null;
}

// Minimal Particle System Component — subtle neutral particles for light theme
function Particles() {
    const particlesRef = useRef();
    const count = 25;

    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 20;
            pos[i * 3 + 1] = Math.random() * 10 - 2;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }
        return pos;
    }, []);

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
                size={0.05}
                color="#c7c7cc"
                transparent
                opacity={0.4}
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
            stroke={active ? "#0071E3" : "#86868b"} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
    );
}

function ProfilesIcon({ active }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={active ? "#0071E3" : "#86868b"} strokeWidth="1.5"
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
            stroke={active ? "#0071E3" : "#86868b"} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    );
}

const LIVE_STATE_POLL_INTERVAL_MS = 120;

const OpenArcade3DView = memo(function OpenArcade3DView({ configClient }) {
    const [selectedButton, setSelectedButton] = useState(null);
    const [activeSection, setActiveSection] = useState("mappings");
    const defaultModules = useMemo(() => ([
        { id: "OA-001", name: "Module A", deviceId: "OA-001", path: "/OpenArcadeAssy_v2.glb", mappings: {}, position: [-1.5, 0, 0] },
        { id: "OA-002", name: "Module B", deviceId: "OA-002", path: "/RevFinalJoystickModule_2026-03-15.glb", mappings: {}, position: [0, 0, 0] },
    ]), []);
    const [modules, setModules] = useState(defaultModules);
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [viewMode, setViewMode] = useState('2d'); // '3d' or '2d'
    const [mappingFilter, setMappingFilter] = useState("all");
    const [isMappingMode, setIsMappingMode] = useState(false);
    const [armedButton, setArmedButton] = useState(null);
    const [mappingStatus, setMappingStatus] = useState(null);
    const [pressedControlIds, setPressedControlIds] = useState([]);
    const [pressedButtons, setPressedButtons] = useState([]);

    useEffect(() => {
        const timer = setTimeout(() => setLoaded(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const currentModuleDeviceIdRef = useRef(defaultModules[0]?.deviceId || null);
    const previousPressedControlIdsRef = useRef(new Set());
    const livePollInFlightRef = useRef(false);
    const sourceBindingInFlightRef = useRef(false);

    // Preload textures to eliminate WebGL warnings
    useEffect(() => {
        // Force texture generation to prevent lazy initialization warnings
        const dummyTexture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
        dummyTexture.generateMipmaps = false;
        dummyTexture.needsUpdate = true;

        // Simple texture preloading using drei's preloader
        modules.forEach(module => {
            useGLTF.preload(module.path);
        });
    }, []);

    const safeCurrentModuleIndex = currentModuleIndex < modules.length ? currentModuleIndex : 0;
    const currentModule = modules[safeCurrentModuleIndex] || defaultModules[0];
    const currentMappings = currentModule?.mappings || {};
    const cameraControl = useCameraController({ currentModuleIndex: safeCurrentModuleIndex, modules, enabled: viewMode === '3d' });

    useEffect(() => {
        currentModuleDeviceIdRef.current = currentModule?.deviceId || null;
    }, [currentModule]);

    const defaultLayout = DEFAULT_LAYOUT;

    const getControlIdForButton = useCallback((deviceLayout, buttonName) => {
        if (deviceLayout && deviceLayout[buttonName]) {
            return deviceLayout[buttonName];
        }
        return defaultLayout[buttonName];
    }, [defaultLayout]);

    const getButtonNameForControlId = useCallback((deviceLayout, controlId) => {
        if (controlId == null) {
            return null;
        }

        const normalizedControlId = String(controlId);
        const layout = deviceLayout || defaultLayout;
        const match = Object.entries(layout).find(([, assignedControlId]) => String(assignedControlId) === normalizedControlId);
        return match?.[0] || null;
    }, [defaultLayout]);

    const mockClientRef = useRef(null);
    if (!mockClientRef.current) {
        mockClientRef.current = new MockConfigClient();
    }
    const activeClient = configClient || mockClientRef.current;

    const applyDeviceConfigs = useCallback((devices) => {
        const deviceEntries = Object.entries(devices || {});
        if (deviceEntries.length === 0) {
            return;
        }

        const positions = [[-1.5, 0, 0], [0, 0, 0], [1.5, 0, 0], [3, 0, 0]];
        const realDevices = deviceEntries.filter(([deviceId]) => deviceId.includes(":"));
        const entriesToRender = realDevices.length > 0 ? realDevices : deviceEntries;
        const selectedDeviceId = currentModuleDeviceIdRef.current;

        const nextModules = entriesToRender.map(([deviceId, deviceConfig], index) => {
            const uiLayout = deviceConfig?.ui?.layout;
            const hasLayout = uiLayout && Object.keys(uiLayout).length > 0;
            const layout = hasLayout ? uiLayout : defaultLayout;
            const model = typeof deviceConfig?.ui?.model === "string"
                ? deviceConfig.ui.model.toLowerCase()
                : null;
            const mode = deviceConfig?.active_mode || "keyboard";
            const mappingConfig = deviceConfig?.modes?.[mode]?.mapping || {};

            const reverseLayout = Object.entries(layout).reduce((acc, [buttonName, controlId]) => {
                acc[String(controlId)] = buttonName;
                return acc;
            }, {});

            const mappings = {};
            Object.entries(mappingConfig).forEach(([controlId, mapping]) => {
                const buttonName = reverseLayout[String(controlId)];
                if (!buttonName) return;

                const keycodeName = typeof mapping === "string" ? mapping : mapping?.keycode;
                const inputValue = getInputForKeycode(keycodeName);
                if (!inputValue) return;

                mappings[buttonName] = {
                    type: HID_INPUT_TYPES.KEYBOARD,
                    input: inputValue,
                    label: getInputLabel(HID_INPUT_TYPES.KEYBOARD, inputValue),
                    action: keycodeName,
                };
            });

            const isJoystickModel = model && (model === "joystick" || model.includes("joy"));

            return {
                id: deviceId,
                name: deviceConfig?.name || deviceId,
                deviceId,
                path: isJoystickModel ? "/RevFinalJoystickModule_2026-03-15.glb" : "/OpenArcadeAssy_v2.glb",
                mappings,
                position: positions[index % positions.length],
                deviceLayout: layout,
                connected: deviceConfig?.connected !== false,
            };
        });

        if (nextModules.length > 0) {
            setModules(nextModules);
            const nextIndex = nextModules.findIndex((module) => module.deviceId === selectedDeviceId);
            setCurrentModuleIndex(nextIndex >= 0 ? nextIndex : 0);
            return;
        }

        setModules(defaultModules);
        const fallbackIndex = defaultModules.findIndex((module) => module.deviceId === selectedDeviceId);
        setCurrentModuleIndex(fallbackIndex >= 0 ? fallbackIndex : 0);
    }, [defaultLayout, getInputForKeycode]);

    const refreshDevices = useCallback(async () => {
        const devices = await activeClient.listDevices();
        applyDeviceConfigs(devices);
    }, [activeClient, applyDeviceConfigs]);

    useEffect(() => {
        let cancelled = false;

        const loadDevices = async () => {
            try {
                await refreshDevices();
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
        if (activeSection === "mappings" && viewMode === "2d") {
            return;
        }

        setIsMappingMode(false);
        setArmedButton(null);
        setMappingStatus(null);
    }, [activeSection, viewMode]);

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

        console.log(`handleButtonClick called: ${buttonName}, currentMappings:`, currentMappings);

        const buttonConfig = currentMappings[buttonName];
        if (buttonConfig && typeof buttonConfig === 'object') {
            // New HID configuration format
            console.log('Setting HID config for button:', buttonName);
            setSelectedButton({ name: buttonName, mesh, ...buttonConfig });
        } else {
            // Legacy format for backward compatibility
            console.log('Setting legacy config for button:', buttonName);
            setSelectedButton({ name: buttonName, mesh, action: buttonConfig || "" });
        }
    }, [currentMappings, isMappingMode, pressedControlIds, viewMode]);

    const handleModuleClick = useCallback((moduleIndex) => {
        setCurrentModuleIndex(moduleIndex);
        setSelectedButton(null);
        setArmedButton(null);
        setMappingStatus(null);
    }, []);

    const toggleViewMode = () => {
        setViewMode(viewMode === '3d' ? '2d' : '3d');
    };

    const saveMapping = (buttonName, config) => {
        setModules(prev => prev.map((mod, idx) => {
            if (idx === safeCurrentModuleIndex) {
                const newMappings = { ...mod.mappings };
                if (config && (config.type || config.input || config.action)) {
                    // New HID configuration
                    newMappings[buttonName] = config;
                } else if (typeof config === 'string') {
                    // Legacy format
                    newMappings[buttonName] = config;
                } else {
                    delete newMappings[buttonName];
                }
                return { ...mod, mappings: newMappings, mappedButtons: Object.keys(newMappings).length };
            }
            return mod;
        }));
        setSelectedButton(null);

        if (!currentModule?.deviceId) {
            return;
        }

        const deviceLayout = currentModule.deviceLayout;
        const controlId = getControlIdForButton(deviceLayout, buttonName);
        if (!controlId || !config || config.type !== HID_INPUT_TYPES.KEYBOARD) {
            return;
        }

        const keycodeName = getKeycodeForInput(config.input);
        if (!keycodeName) {
            return;
        }

        activeClient.setMapping(currentModule.deviceId, "keyboard", controlId, { keycode: keycodeName })
            .catch((error) => {
                console.warn("Failed to update mapping:", error);
            });
    };

    const clearMapping = (buttonName) => {
        saveMapping(buttonName, null);
    };

    const handleModuleChange = (index) => {
        setCurrentModuleIndex(index);
        setSelectedButton(null);
        setArmedButton(null);
        setMappingStatus(null);
    };

    const navigatePrev = useCallback(() => {
        setCurrentModuleIndex(prev => {
            const next = prev > 0 ? prev - 1 : prev;
            if (next !== prev) {
                setSelectedButton(null);
                setArmedButton(null);
                setMappingStatus(null);
            }
            return next;
        });
    }, []);

    const navigateNext = useCallback(() => {
        setCurrentModuleIndex(prev => {
            const next = prev < modules.length - 1 ? prev + 1 : prev;
            if (next !== prev) {
                setSelectedButton(null);
                setArmedButton(null);
                setMappingStatus(null);
            }
            return next;
        });
    }, [modules.length]);

    // Arrow key navigation in 2D view
    useEffect(() => {
        if (viewMode !== '2d' || activeSection !== 'mappings') return;

        const handleKeyDown = (e) => {
            // Don't navigate when a modal is open
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

    useEffect(() => {
        const currentDeviceId = currentModule?.deviceId;
        const currentLayout = currentModule?.deviceLayout || defaultLayout;

        if (activeSection !== 'mappings' || !currentDeviceId || typeof activeClient.getLiveState !== 'function') {
            previousPressedControlIdsRef.current = new Set();
            setPressedControlIds([]);
            setPressedButtons([]);
            return;
        }

        let cancelled = false;

        const syncLiveState = async () => {
            if (livePollInFlightRef.current) {
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

                setPressedControlIds(nextPressedControlIds);
                setPressedButtons(nextPressedButtons);

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
                    await activeClient.setUiBinding(currentDeviceId, targetButtonName, capturedControlId, 'swap');
                    await refreshDevices();
                    if (!cancelled) {
                        setArmedButton(null);
                        setMappingStatus({
                            type: 'success',
                            message: `${targetButtonName} now follows physical control ${capturedControlId}.`,
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
    }, [
        activeClient,
        activeSection,
        armedButton,
        currentModule?.deviceId,
        currentModule?.deviceLayout,
        defaultLayout,
        getButtonNameForControlId,
        isMappingMode,
        refreshDevices,
    ]);

    const clearAllMappings = () => {
        setModules(prev => prev.map((mod, idx) => {
            if (idx === safeCurrentModuleIndex) {
                return { ...mod, mappings: {}, mappedButtons: 0 };
            }
            return mod;
        }));
        setSelectedButton(null);
    };

    const saveToDevice = async (moduleId) => {
        const module = modules.find(mod => mod.id === moduleId);
        if (module) {
            try {
                // Show loading state (could add toast/loading indicator here)
                console.log('Saving configuration to device...');

                const layout = module.deviceLayout || defaultLayout;
                const mode = "keyboard";
                for (const [buttonName, mapping] of Object.entries(module.mappings)) {
                    if (mapping?.type !== HID_INPUT_TYPES.KEYBOARD) {
                        continue;
                    }
                    const controlId = getControlIdForButton(layout, buttonName);
                    const keycodeName = getKeycodeForInput(mapping.input);
                    if (!controlId || !keycodeName) {
                        continue;
                    }
                    await activeClient.setMapping(module.deviceId, mode, controlId, { keycode: keycodeName });
                }
                await activeClient.setActiveMode(module.deviceId, mode);

                console.log('Configuration saved successfully!');
                // Could add success notification here

            } catch (error) {
                console.error('Failed to save configuration:', error);
                // Could add error notification here
            }
        }
    };

    const navItems = [
        { id: "mappings", label: "Mappings", Icon: MappingsIcon },
        { id: "profiles", label: "Profiles", Icon: ProfilesIcon },
        { id: "live", label: "Live Input", Icon: LiveInputIcon },
    ];

    const showMappingsView = activeSection === "mappings";

    return (
        <div
            className={`w-screen h-screen flex flex-col overflow-hidden bg-[#f5f5f7] transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        >
            {/* Top Header */}
            <ControllerHUD
                controllerName="OpenArcade Controller v1.0"
                moduleCount={modules.length}
                currentModule={safeCurrentModuleIndex}
                modules={modules.map(m => ({ ...m, mappedButtons: Object.keys(m.mappings).length }))}
                onModuleChange={handleModuleChange}
                isConnected={modules.some((module) => module.connected !== false)}
                viewMode={viewMode}
                mappingFilter={mappingFilter}
                onMappingFilterChange={setMappingFilter}
                onToggleView={toggleViewMode}
            />

            <div className="flex flex-1 min-h-0">
                {/* Left Sidebar Navigation */}
                <div className="w-[68px] bg-white border-r border-gray-200/60 flex flex-col items-center pt-4 gap-1 shrink-0">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`group relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${
                                activeSection === item.id
                                    ? "bg-[#0071E3]/10"
                                    : "hover:bg-gray-100"
                            }`}
                            title={item.label}
                        >
                            <item.Icon active={activeSection === item.id} />
                            {/* Active indicator dot */}
                            {activeSection === item.id && (
                                <div className="absolute -left-[2px] top-1/2 -translate-y-1/2 w-1 h-5 bg-[#0071E3] rounded-r-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                {showMappingsView ? (
                    <>
                        {/* Canvas Area */}
                        <div className="flex-1 relative animate-fade-in">
                            <Canvas
                                key={viewMode}
                                orthographic={viewMode === '2d'}
                                camera={viewMode === '3d' ? { position: [0, 1.5, 3], fov: 45 } : { position: [0, 5, 0], rotation: [-Math.PI / 2, 0, 0], zoom: 25 }}
                                style={{
                                    background: "linear-gradient(180deg, #f5f5f7 0%, #ebebed 100%)",
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
                                {/* --- Enhanced Lighting System --- */}

                                {/* Ambient base light — neutral warm for light bg */}
                                <ambientLight intensity={1.0} color="#f0f0f2" />

                                {/* Key Light - bright directional with shadows */}
                                <directionalLight
                                    position={[5, 12, 8]}
                                    intensity={1.2}
                                    color="#f7f8fb"
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

                                {/* Fill Light - cool soft light */}
                                <directionalLight
                                    position={[-8, 6, 4]}
                                    intensity={0.5}
                                    color="#dce4ee"
                                />

                                {/* Rim Light - back light for edge definition */}
                                <directionalLight
                                    position={[0, 3, -10]}
                                    intensity={0.5}
                                    color="#c8d4e0"
                                />

                                {/* Accent Light 1 */}
                                <pointLight
                                    position={[3, 4, 3]}
                                    intensity={0.35}
                                    color="#f0f0f5"
                                    distance={15}
                                    decay={2}
                                />

                                {/* Accent Light 2 */}
                                <pointLight
                                    position={[-4, 3, -2]}
                                    intensity={0.25}
                                    color="#d8e0ea"
                                    distance={12}
                                    decay={2}
                                />

                                {/* --- Ground Plane --- */}
                                <mesh
                                    rotation={[-Math.PI / 2, 0, 0]}
                                    position={[0, -0.5, 0]}
                                    receiveShadow
                                >
                                    <planeGeometry args={[50, 50]} />
                                    <shadowMaterial opacity={0.12} />
                                </mesh>

                                {/* --- Subtle Grid --- */}
                                <gridHelper
                                    args={[40, 40, "#d2d2d7", "#e5e5ea"]}
                                    position={[0, -0.15, 0]}
                                />
                                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]}>
                                    <planeGeometry args={[40, 40, 40, 40]} />
                                    <meshBasicMaterial
                                        color="#d2d2d7"
                                        wireframe
                                        transparent
                                        opacity={0.15}
                                    />
                                </mesh>

                                {/* --- Minimal Particle System --- */}
                                <Particles />

                                <Bounds clip observe={false} margin={1}>
                                    <CameraSetter viewMode={viewMode} currentModulePosition={currentModule.position} />
                                    {modules.map((module, index) => (
                                        <MemoizedChildModule
                                            path={module.path}
                                            onButtonClick={handleButtonClick}
                                            onModuleClick={() => handleModuleClick(index)}
                                            isEditable={index === safeCurrentModuleIndex}
                                            position={module.position}
                                            viewMode={viewMode}
                                            isActive={index === safeCurrentModuleIndex}
                                            mappings={module.mappings}
                                            mappingFilter={mappingFilter}
                                            pressedButtons={index === safeCurrentModuleIndex ? pressedButtons : []}
                                            armedButton={index === safeCurrentModuleIndex ? armedButton : null}
                                            isMappingMode={index === safeCurrentModuleIndex ? isMappingMode : false}
                                            key={module.deviceId || module.id}
                                        />
                                    ))}
                                </Bounds>
                                {viewMode === '3d' && (
                                    <CameraController
                                        targetRef={cameraControl.targetRef}
                                        cameraPositionRef={cameraControl.cameraPositionRef}
                                        animationStart={cameraControl.animationStart}
                                    />
                                )}
                            </Canvas>

                            {/* Module navigation overlay — 2D view only */}
                            {viewMode === '2d' && modules.length > 1 && (
                                <>
                                    {/* Left arrow */}
                                    <button
                                        onClick={navigatePrev}
                                        disabled={safeCurrentModuleIndex === 0}
                                        className={`absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-sm transition-all duration-200 ${
                                            safeCurrentModuleIndex === 0
                                                ? "opacity-30 cursor-default"
                                                : "hover:bg-white hover:shadow-md active:scale-95 cursor-pointer"
                                        }`}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="15 18 9 12 15 6" />
                                        </svg>
                                    </button>

                                    {/* Right arrow */}
                                    <button
                                        onClick={navigateNext}
                                        disabled={safeCurrentModuleIndex === modules.length - 1}
                                        className={`absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-sm transition-all duration-200 ${
                                            safeCurrentModuleIndex === modules.length - 1
                                                ? "opacity-30 cursor-default"
                                                : "hover:bg-white hover:shadow-md active:scale-95 cursor-pointer"
                                        }`}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </button>

                                    {/* Module indicator dots */}
                                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200/60 shadow-sm">
                                        {modules.map((mod, i) => (
                                            <button
                                                key={mod.deviceId || mod.id}
                                                onClick={() => handleModuleChange(i)}
                                                className={`flex items-center gap-2 transition-all duration-200 ${
                                                    i === safeCurrentModuleIndex ? "opacity-100" : "opacity-40 hover:opacity-70"
                                                }`}
                                            >
                                                <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                                    i === safeCurrentModuleIndex ? "bg-[#0071E3] scale-125" : "bg-gray-400"
                                                }`} />
                                                <span className={`text-xs font-medium whitespace-nowrap transition-colors duration-200 ${
                                                    i === safeCurrentModuleIndex ? "text-[#1d1d1f]" : "text-gray-400"
                                                }`}>
                                                    {mod.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Right Sidebar (Inspector) */}
                        <div className="flex flex-col w-[300px] h-full shrink-0">
                            <div className="flex-1 overflow-auto">
                                {viewMode === '3d' ? (
                                    <ButtonMappingsPanel
                                        mappings={currentMappings}
                                        moduleName={currentModule.name}
                                        onSelectButton={handleButtonClick}
                                    />
                                ) : (
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
                                    />
                                )}
                            </div>
                        </div>
                    </>
                ) : activeSection === "profiles" ? (
                    <ProfilesPanel />
                ) : (
                    <LiveInputPanel />
                )}
            </div>

            {/* Modal Layer */}
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
