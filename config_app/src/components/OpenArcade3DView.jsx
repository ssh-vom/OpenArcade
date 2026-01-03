import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ChildModule } from "./ChildModule.jsx";
import { CameraController } from "./CameraController.jsx";
import { useCameraController } from "../hooks/useCameraController.jsx";
import { useState, useEffect, memo, useRef } from "react";
import { useGLTF, Bounds } from "@react-three/drei";
import ButtonMappingModal from "./ButtonMappingModal.jsx";
import ButtonMappingsPanel from "./ButtonMappingsPanel.jsx";
import ControllerHUD from "./ControllerHUD.jsx";

// Preload GLBs
useGLTF.preload("/OpenArcadeAssy_v2.glb");
useGLTF.preload("/OpenArcadeAssyJoystick_v1.glb");

// FPS Monitor Component
function FPSMonitor() {
    const fpsRef = useRef(0);
    const frameCountRef = useRef(0);
    const lastTimeRef = useRef(0);

    useFrame(() => {
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastTimeRef.current >= 1000) {
            fpsRef.current = frameCountRef.current;
            frameCountRef.current = 0;
            lastTimeRef.current = now;
            if (fpsRef.current < 30) console.warn(`Low FPS: ${fpsRef.current}`);
        }
    });

    return null;
}

// Camera Setter Component
function CameraSetter({ viewMode }) {
    const { camera } = useThree();

    useEffect(() => {
        if (viewMode === '2d') {
            camera.rotation.set(-Math.PI / 2, 0, 0);
        } else {
            camera.rotation.set(0, 0, 0);
        }
    }, [viewMode, camera]);

    return null;
}

const OpenArcade3DView = memo(function OpenArcade3DView() {
    const [selectedButton, setSelectedButton] = useState(null);
    const [modules, setModules] = useState([
        { id: 1, name: "Module A", deviceId: "OA-001", path: "/OpenArcadeAssy_v2.glb", mappings: {}, position: [-3, 0, 0] },
        { id: 2, name: "Module B", deviceId: "OA-002", path: "/OpenArcadeAssyJoystick_v1.glb", mappings: {}, position: [0, 0, 0] },
    ]);
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [viewMode, setViewMode] = useState('3d'); // '3d' or '2d'

    useEffect(() => {
        const timer = setTimeout(() => setLoaded(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const currentModule = modules[currentModuleIndex];
    const currentMappings = currentModule.mappings;
    const cameraControl = useCameraController({ currentModuleIndex, modules, enabled: viewMode === '3d' });

    const handleButtonClick = (buttonName, mesh) => {
        setSelectedButton({ name: buttonName, mesh, action: currentMappings[buttonName] || "" });
    };

    const handleModuleClick = (moduleIndex) => {
        setCurrentModuleIndex(moduleIndex);
        setSelectedButton(null);
    };

    const toggleViewMode = () => {
        setViewMode(viewMode === '3d' ? '2d' : '3d');
    };

    const saveMapping = (buttonName, action) => {
        setModules(prev => prev.map((mod, idx) =>
            idx === currentModuleIndex
                ? { ...mod, mappings: { ...mod.mappings, [buttonName]: action }, mappedButtons: Object.keys(mod.mappings).length + (action ? 1 : 0) }
                : mod
        ));
        setSelectedButton(null);
    };

    const clearMapping = (buttonName) => {
        setModules(prev => prev.map((mod, idx) => {
            if (idx === currentModuleIndex) {
                const newMappings = { ...mod.mappings };
                delete newMappings[buttonName];
                return { ...mod, mappings: newMappings, mappedButtons: Object.keys(newMappings).length };
            }
            return mod;
        }));
        setSelectedButton(null);
    };

    const handleModuleChange = (index) => {
        setCurrentModuleIndex(index);
        setSelectedButton(null);
    };

    return (
        <>
            <div style={{
                width: "100vw",
                height: "100vh",
                display: "flex",
                overflow: "hidden",
                background: "#0a0a0a",
                opacity: loaded ? 1 : 0,
                transition: "opacity 0.5s ease-in-out"
            }}>

                {/* Left Sidebar (HUD) */}
                <ControllerHUD
                    controllerName="OpenArcade Controller v1.0"
                    moduleCount={modules.length}
                    currentModule={currentModuleIndex}
                    modules={modules.map(m => ({ ...m, mappedButtons: Object.keys(m.mappings).length }))}
                    onModuleChange={handleModuleChange}
                    isConnected={true}
                />

                {/* Main Canvas Area */}
                <div style={{ flex: 1, position: "relative", animation: "fadeIn 0.8s ease-out 0.2s both" }}>
                    <Canvas
                        orthographic={viewMode === '2d'}
                        camera={viewMode === '3d' ? { position: [0, 2, 5], fov: 45 } : { position: [0, 10, 0], rotation: [-Math.PI / 2, 0, 0], zoom: 50 }}
                        style={{ background: "#0a0a0a", width: "100%", height: "100%" }}
                    >

                        {/* --- Lights --- */}

                        <ambientLight intensity={1.0} />

                        {/* Key Light */}
                        <directionalLight
                            position={[4, 10, 6]}
                            intensity={2}
                        />

                        {/* Fill Light */}
                        <directionalLight
                            position={[-6, 8, 4]}
                            intensity={1}
                        />
                        <Bounds clip observe margin={1}>
                            <FPSMonitor />
                            <CameraSetter viewMode={viewMode} />
                            {modules.map((module, index) => (
                                <ChildModule
                                    path={module.path}
                                    onButtonClick={viewMode === '3d' ? handleButtonClick : null}
                                    onModuleClick={() => handleModuleClick(index)}
                                    isEditable={viewMode === '3d' && index === currentModuleIndex}
                                    position={module.position}
                                    viewMode={viewMode}
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
                    <button
                        onClick={toggleViewMode}
                        style={{
                            margin: '10px',
                            padding: '10px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                    >
                        Switch to {viewMode === '3d' ? '2D Top-Down' : '3D'} View
                    </button>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        <ButtonMappingsPanel
                            mappings={currentMappings}
                            moduleName={currentModule.name}
                            onSelectButton={handleButtonClick}
                        />
                    </div>
                </div>

                {/* Modal Layer */}
                {selectedButton && (
                    <ButtonMappingModal
                        button={selectedButton}
                        onSave={saveMapping}
                        onCancel={() => setSelectedButton(null)}
                        onClear={clearMapping}
                    />
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

