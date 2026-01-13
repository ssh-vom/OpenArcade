import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MemoizedChildModule } from "./ChildModule.jsx";
import { CameraController } from "./CameraController.jsx";
import { useCameraController } from "../hooks/useCameraController.jsx";
import { useState, useEffect, memo, useRef, useCallback, useMemo } from "react";
import { useGLTF, Bounds, Grid } from "@react-three/drei";
import ButtonMappingModal from "./ButtonMappingModal.jsx";
import ButtonMappingsPanel from "./ButtonMappingsPanel.jsx";
import HIDButtonMappingModal from "./HIDButtonMappingModal.jsx";
import D2ConfigPanel from "./D2ConfigPanel.jsx";
import DeviceStorage from "../services/DeviceStorage.js";
import ControllerHUD from "./ControllerHUD.jsx";
import * as THREE from "three";
import { HID_INPUT_TYPES, getInputLabel } from "../services/HIDManager.js";

// Preload GLBs with texture generation
useGLTF.preload("/OpenArcadeAssy_v2.glb");
useGLTF.preload("/OpenArcadeAssyJoystick_v1.glb");


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

// Minimal Particle System Component
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
                color="#b68d47"
                transparent
                opacity={0.6}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

const OpenArcade3DView = memo(function OpenArcade3DView({ configClient }) {
    const [selectedButton, setSelectedButton] = useState(null);
    const defaultModules = useMemo(() => ([
        { id: 1, name: "Module A", deviceId: "OA-001", path: "/OpenArcadeAssy_v2.glb", mappings: {}, position: [-1.5, 0, 0] },
        { id: 2, name: "Module B", deviceId: "OA-002", path: "/OpenArcadeAssyJoystick_v1.glb", mappings: {}, position: [0, 0, 0] },
    ]), []);
    const [modules, setModules] = useState(defaultModules);
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [viewMode, setViewMode] = useState('2d'); // '3d' or '2d'

    useEffect(() => {
        const timer = setTimeout(() => setLoaded(true), 50);
        return () => clearTimeout(timer);
    }, []);

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

    const currentModule = modules[currentModuleIndex];
    const currentMappings = currentModule.mappings;
    const cameraControl = useCameraController({ currentModuleIndex, modules, enabled: viewMode === '3d' });

    const defaultLayout = useMemo(() => ({
        button_1: "1",
        button_2: "2",
        button_3: "3",
        button_4: "4",
        button_5: "5",
        button_6: "6",
        button_7: "7",
        button_8: "8",
        button_start: "14",
        button_bt: "15",
    }), []);

    const getControlIdForButton = useCallback((deviceLayout, buttonName) => {
        if (deviceLayout && deviceLayout[buttonName]) {
            return deviceLayout[buttonName];
        }
        return defaultLayout[buttonName];
    }, [defaultLayout]);

    const keyInputToHid = useCallback((inputValue) => {
        if (!inputValue) return null;
        if (inputValue.startsWith("key_")) {
            const suffix = inputValue.slice(4).toUpperCase();
            return `HID_KEY_${suffix}`;
        }
        return null;
    }, []);

    const hidToKeyInput = useCallback((keycodeName) => {
        if (!keycodeName || typeof keycodeName !== "string") return null;
        if (!keycodeName.startsWith("HID_KEY_")) return null;
        const suffix = keycodeName.slice("HID_KEY_".length).toLowerCase();
        return `key_${suffix}`;
    }, []);

    const applyDeviceConfigs = useCallback((devices) => {
        const deviceEntries = Object.entries(devices || {});
        if (deviceEntries.length === 0) {
            return;
        }

        const positions = [[-1.5, 0, 0], [0, 0, 0], [1.5, 0, 0], [3, 0, 0]];
        const realDevices = deviceEntries.filter(([deviceId]) => deviceId.includes(":"));
        const entriesToRender = realDevices.length > 0 ? realDevices : deviceEntries;

        const nextModules = entriesToRender.map(([deviceId, deviceConfig], index) => {
            const uiLayout = deviceConfig?.ui?.layout;
            const hasLayout = uiLayout && Object.keys(uiLayout).length > 0;
            const layout = hasLayout ? uiLayout : defaultLayout;
            const model = deviceConfig?.ui?.model;
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
                const inputValue = hidToKeyInput(keycodeName);
                if (!inputValue) return;

                mappings[buttonName] = {
                    type: HID_INPUT_TYPES.KEYBOARD,
                    input: inputValue,
                    label: getInputLabel(HID_INPUT_TYPES.KEYBOARD, inputValue),
                    action: keycodeName,
                };
            });

            return {
                id: index + 1,
                name: deviceConfig?.name || deviceId,
                deviceId,
                path: model === "joystick" ? "/OpenArcadeAssyJoystick_v1.glb" : "/OpenArcadeAssy_v2.glb",
                mappings,
                position: positions[index % positions.length],
                deviceLayout: layout,
                connected: deviceConfig?.connected !== false,
            };
        });

        if (nextModules.length > 0) {
            setModules(nextModules);
            setCurrentModuleIndex(0);
            return;
        }

        setModules(defaultModules);
        setCurrentModuleIndex(0);
    }, [defaultLayout, hidToKeyInput]);

    useEffect(() => {
        if (!configClient) {
            return;
        }
        let cancelled = false;

        const loadDevices = async () => {
            try {
                const devices = await configClient.listDevices();
                if (!cancelled) {
                    applyDeviceConfigs(devices);
                }
            } catch (error) {
                console.warn("Failed to load devices:", error);
            }
        };

        loadDevices();
        return () => {
            cancelled = true;
        };
    }, [configClient, applyDeviceConfigs]);

    const handleButtonClick = useCallback((buttonName, mesh) => {
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
    }, [currentMappings]);

    const handleModuleClick = useCallback((moduleIndex) => {
        setCurrentModuleIndex(moduleIndex);
        setSelectedButton(null);
    }, []);

    const toggleViewMode = () => {
        setViewMode(viewMode === '3d' ? '2d' : '3d');
    };

    const saveMapping = (buttonName, config) => {
        setModules(prev => prev.map((mod, idx) => {
            if (idx === currentModuleIndex) {
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

        if (!configClient || !currentModule?.deviceId) {
            return;
        }

        const deviceLayout = currentModule.deviceLayout;
        const controlId = getControlIdForButton(deviceLayout, buttonName);
        if (!controlId || !config || config.type !== HID_INPUT_TYPES.KEYBOARD) {
            return;
        }

        const keycodeName = keyInputToHid(config.input);
        if (!keycodeName) {
            return;
        }

        configClient.setMapping(currentModule.deviceId, "keyboard", controlId, { keycode: keycodeName })
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
    };

    const clearAllMappings = () => {
        setModules(prev => prev.map((mod, idx) => {
            if (idx === currentModuleIndex) {
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

                if (configClient && module.deviceId) {
                    const layout = module.deviceLayout || defaultLayout;
                    const mode = "keyboard";
                    for (const [buttonName, mapping] of Object.entries(module.mappings)) {
                        if (mapping?.type !== HID_INPUT_TYPES.KEYBOARD) {
                            continue;
                        }
                        const controlId = getControlIdForButton(layout, buttonName);
                        const keycodeName = keyInputToHid(mapping.input);
                        if (!controlId || !keycodeName) {
                            continue;
                        }
                        await configClient.setMapping(module.deviceId, mode, controlId, { keycode: keycodeName });
                    }
                    await configClient.setActiveMode(module.deviceId, mode);
                } else {
                    DeviceStorage.saveModuleConfig(moduleId, module.mappings);
                    await DeviceStorage.syncToDevice(moduleId);
                }

                console.log('Configuration saved successfully!');
                // Could add success notification here

            } catch (error) {
                console.error('Failed to save configuration:', error);
                // Could add error notification here
            }
        }
    };

    return (
        <>
            <div style={{
                width: "100vw",
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                background: "radial-gradient(900px circle at 18% 8%, rgba(215, 177, 90, 0.14), transparent 60%), radial-gradient(700px circle at 88% 6%, rgba(240, 204, 122, 0.1), transparent 55%), var(--oa-bg)",
                opacity: loaded ? 1 : 0,
                transition: "opacity 0.5s ease-in-out"
            }}>

                <ControllerHUD
                    controllerName="OpenArcade Controller v1.0"
                    moduleCount={modules.length}
                    currentModule={currentModuleIndex}
                    modules={modules.map(m => ({ ...m, mappedButtons: Object.keys(m.mappings).length }))}
                    onModuleChange={handleModuleChange}
                    isConnected={modules.some((module) => module.connected !== false)}
                    viewMode={viewMode}
                    onToggleView={toggleViewMode}
                />

                <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
                    {/* Main Canvas Area */}
                    <div style={{ flex: 1, position: "relative", animation: "fadeIn 0.8s ease-out 0.2s both" }}>
                        <Canvas
                            key={viewMode}
                            orthographic={viewMode === '2d'}
                            camera={viewMode === '3d' ? { position: [0, 1.5, 3], fov: 45 } : { position: [0, 5, 0], rotation: [-Math.PI / 2, 0, 0], zoom: 25 }}
                            style={{
                            background: "radial-gradient(1200px circle at 24% 0%, rgba(215, 177, 90, 0.08), transparent 55%), radial-gradient(900px circle at 78% 15%, rgba(240, 204, 122, 0.08), transparent 60%), #0a0a0b",
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
                            {/* Fog for depth perception */}
                        // <fog attach="fog" args={["#0a0a0a", 8, 25]} />


                            {/* --- Enhanced Lighting System --- */}

                            {/* Ambient base light for overall illumination */}
                        <ambientLight intensity={0.7} color="#3a3120" />

                            {/* Key Light - warm directional with shadows */}
                            <directionalLight
                                position={[5, 12, 8]}
                                intensity={1.2}
                            color="#ffe3b5"
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
                            color="#d8c19a"
                            />

                            {/* Rim Light - back light for edge definition */}
                            <directionalLight
                                position={[0, 3, -10]}
                                intensity={0.6}
                            color="#9a7d4e"
                            />

                            {/* Accent Light 1 - warm highlight */}
                            <pointLight
                                position={[3, 4, 3]}
                                intensity={0.4}
                            color="#f3d2a1"
                                distance={15}
                                decay={2}
                            />

                            {/* Accent Light 2 - cool highlight */}
                            <pointLight
                                position={[-4, 3, -2]}
                                intensity={0.3}
                            color="#c9a56a"
                                distance={12}
                                decay={2}
                            />

                            {/* --- Procedural Ground Plane --- */}
                            <mesh
                                rotation={[-Math.PI / 2, 0, 0]}
                                position={[0, -0.5, 0]}
                                receiveShadow
                            >
                                <planeGeometry args={[50, 50]} />
                                <shadowMaterial opacity={0.4} />
                            </mesh>

                        {/* --- Tech Grid --- */}
                        <gridHelper
                            args={[40, 40, "#f0c46c", "#5f4a28"]}
                            position={[0, -0.15, 0]}
                        />
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]}>
                            <planeGeometry args={[40, 40, 40, 40]} />
                            <meshBasicMaterial
                                color="#5f4a28"
                                wireframe
                                transparent
                                opacity={0.35}
                            />
                        </mesh>

                            {/* --- Minimal Particle System --- */}
                            <Particles />

                            <Bounds clip observe={false} margin={1}>
                                {/* <FPSMonitor /> */}
                                <CameraSetter viewMode={viewMode} currentModulePosition={currentModule.position} />
                                {modules.map((module, index) => (
                                    <MemoizedChildModule
                                        path={module.path}
                                        onButtonClick={handleButtonClick}
                                        onModuleClick={() => handleModuleClick(index)}
                                        isEditable={index === currentModuleIndex}
                                        position={module.position}
                                        viewMode={viewMode}
                                        isActive={index === currentModuleIndex}
                                        mappings={module.mappings}
                                        key={module.id}
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
                    </div>

                    {/* Right Sidebar (Inspector) */}
                    <div style={{ display: 'flex', flexDirection: 'column', width: '300px', height: '100%' }}>
                        <div style={{ flex: 1, overflow: 'auto' }}>
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
                                />
                            )}
                        </div>
                    </div>
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
            <style>{`
            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }
        `}</style>
        </>
    );
});

OpenArcade3DView.displayName = 'OpenArcade3DView';

export { OpenArcade3DView };
