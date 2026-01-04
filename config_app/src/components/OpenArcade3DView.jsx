import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ChildModule, MemoizedChildModule } from "./ChildModule.jsx";
import { CameraController } from "./CameraController.jsx";
import { useCameraController } from "../hooks/useCameraController.jsx";
import { useState, useEffect, memo, useRef, useCallback, useMemo } from "react";
import { useGLTF, Bounds, Grid, Float } from "@react-three/drei";
import ButtonMappingModal from "./ButtonMappingModal.jsx";
import ButtonMappingsPanel from "./ButtonMappingsPanel.jsx";
import ControllerHUD from "./ControllerHUD.jsx";
import * as THREE from "three";

// Preload GLBs with texture generation
useGLTF.preload("/OpenArcadeAssy_v2.glb");
useGLTF.preload("/OpenArcadeAssyJoystick_v1.glb");

// FPS Monitor Component - optimized
function FPSMonitor() {
    const fpsRef = useRef(0);
    const frameCountRef = useRef(0);
    const lastTimeRef = useRef(0);
    const lastLogRef = useRef(0);

    useFrame(() => {
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastTimeRef.current >= 1000) {
            fpsRef.current = frameCountRef.current;
            frameCountRef.current = 0;
            lastTimeRef.current = now;

            // Only log every 5 seconds to avoid console spam
            if (now - lastLogRef.current >= 5000 && fpsRef.current < 30) {
                console.warn(`Low FPS: ${fpsRef.current}`);
                lastLogRef.current = now;
            }
        }
    });

    return null;
}

// Camera Setter Component
function CameraSetter({ viewMode, currentModulePosition }) {
    const { camera } = useThree();

    useEffect(() => {
        if (viewMode === '2d') {
            // Position camera above the current module in 2D mode
            camera.position.set(currentModulePosition[0], 5, currentModulePosition[2]);
            camera.rotation.set(-Math.PI / 2, 0, 0);
            camera.zoom = 5;
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
                color="#5a5a7a"
                transparent
                opacity={0.6}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

const OpenArcade3DView = memo(function OpenArcade3DView() {
    const [selectedButton, setSelectedButton] = useState(null);
    const [modules, setModules] = useState([
        { id: 1, name: "Module A", deviceId: "OA-001", path: "/OpenArcadeAssy_v2.glb", mappings: {}, position: [-1.5, 0, 0] },
        { id: 2, name: "Module B", deviceId: "OA-002", path: "/OpenArcadeAssyJoystick_v1.glb", mappings: {}, position: [0, 0, 0] },
    ]);
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [viewMode, setViewMode] = useState('3d'); // '3d' or '2d'

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

    const handleButtonClick = useCallback((buttonName, mesh) => {
        setSelectedButton({ name: buttonName, mesh, action: currentMappings[buttonName] || "" });
    }, [currentMappings]);

    const handleModuleClick = useCallback((moduleIndex) => {
        setCurrentModuleIndex(moduleIndex);
        setSelectedButton(null);
    }, []);

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
                        camera={viewMode === '3d' ? { position: [0, 1.5, 3], fov: 45 } : { position: [0, 5, 0], rotation: [-Math.PI / 2, 0, 0], zoom: 25 }}
                        style={{ background: "radial-gradient(circle at center, #1a1a2e 0%, #0a0a0a 100%)", width: "100%", height: "100%" }}
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
                        <fog attach="fog" args={["#0a0a0a", 8, 25]} />


                        {/* --- Enhanced Lighting System --- */}

                        {/* Ambient base light for overall illumination */}
                        <ambientLight intensity={0.4} color="#404060" />

                        {/* Key Light - warm directional with shadows */}
                        <directionalLight
                            position={[5, 12, 8]}
                            intensity={1.2}
                            color="#fff5e6"
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
                            color="#e6f0ff"
                        />

                        {/* Rim Light - back light for edge definition */}
                        <directionalLight
                            position={[0, 3, -10]}
                            intensity={0.6}
                            color="#f0e6ff"
                        />

                        {/* Accent Light 1 - warm highlight */}
                        <pointLight
                            position={[3, 4, 3]}
                            intensity={0.4}
                            color="#fff0e6"
                            distance={15}
                            decay={2}
                        />

                        {/* Accent Light 2 - cool highlight */}
                        <pointLight
                            position={[-4, 3, -2]}
                            intensity={0.3}
                            color="#e6f0ff"
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
                        <Grid
                            args={[50, 50]}
                            position={[0, -0.49, 0]}
                            cellSize={1}
                            cellThickness={0.02}
                            cellColor="#2a2a2a"
                            sectionSize={5}
                            sectionThickness={0.04}
                            sectionColor="#3a3a3a"
                            fadeDistance={25}
                            fadeStrength={1}
                        />

                        {/* --- Minimal Particle System --- */}
                        <Particles />

                        <Bounds clip observe={false} margin={1}>
                            {/* <FPSMonitor /> */}
                            <CameraSetter viewMode={viewMode} currentModulePosition={currentModule.position} />
                            {modules.map((module, index) => (
                                <MemoizedChildModule
                                    path={module.path}
                                    onButtonClick={viewMode === '3d' ? handleButtonClick : null}
                                    onModuleClick={() => handleModuleClick(index)}
                                    isEditable={viewMode === '3d' && index === currentModuleIndex}
                                    position={module.position}
                                    viewMode={viewMode}
                                    isActive={index === currentModuleIndex}
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

