import { memo, useLayoutEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Bounds } from "@react-three/drei";
import * as THREE from "three";
import { MemoizedChildModule } from "./ChildModule";
import { CameraController } from "./CameraController";
import { useCameraController, useOpenArcade } from "../hooks";
import ButtonMappingModal from "./ButtonMappingModal";
import HIDButtonMappingModal from "./HIDButtonMappingModal";
import D2ConfigPanel from "./D2ConfigPanel";
import ProfilesPanel from "./ProfilesPanel";
import LiveInputPanel from "./LiveInputPanel";
import ControllerHUD from "./ControllerHUD";
import { DEFAULT_LAYOUT, HID_INPUT_TYPES } from "../services/HIDManager";
import { MappingsIcon, ProfilesIcon, LiveInputIcon } from "./icons";
import type { IConfigClient, MappingConfig } from "@/types";
import type { ModuleState } from "../hooks";

// Preload GLBs with Draco decoding enabled
useGLTF.preload("/TP1_B_0_BUTTON.glb", true);
useGLTF.preload("/TP1_A_0_JOYSTICK.glb", true);
useGLTF.preload("/TP1_A_0_BUTTON.glb", true);

// Camera Setter Component
function CameraSetter({ viewMode, currentModulePosition }: { viewMode: '2d' | '3d'; currentModulePosition: number[] }) {
    const { camera } = useThree();
    const orthoZoom = 1000;

    useLayoutEffect(() => {
        if (viewMode === '2d') {
            camera.position.set(currentModulePosition[0], 5, currentModulePosition[2]);
            camera.rotation.set(-Math.PI / 2, 0, 0);
            (camera as THREE.OrthographicCamera).zoom = orthoZoom;
            camera.updateProjectionMatrix();
        } else {
            camera.position.set(0, 1.5, 3);
            camera.rotation.set(0, 0, 0);
            (camera as THREE.PerspectiveCamera).zoom = 1;
            camera.updateProjectionMatrix();
        }
    }, [viewMode, currentModulePosition, camera]);

    return null;
}

// Seeded random generator for stable particle positions
const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
};

// Minimal Particle System Component
function Particles() {
    const count = 30;
    
    // Memoize positions array to avoid recreating on every render
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (seededRandom(i * 3) - 0.5) * 20;
            pos[i * 3 + 1] = seededRandom(i * 3 + 1) * 10 - 2;
            pos[i * 3 + 2] = (seededRandom(i * 3 + 2) - 0.5) * 20;
        }
        return pos;
    }, []);

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        const posAttr = state.scene.getObjectByName('particles')?.geometry.attributes.position;
        if (posAttr && posAttr.array) {
            const arr = posAttr.array as Float32Array;
            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                arr[i3 + 1] += Math.sin(time * 0.3 + i) * 0.002;
                arr[i3] += Math.cos(time * 0.2 + i) * 0.001;
            }
            posAttr.needsUpdate = true;
        }
    });

    return (
        <points name="particles">
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

function SwitchTo2DNotice({ message, onSwitch }: { message: string; onSwitch: () => void }) {
    return (
        <div className="flex-1 flex items-center justify-center bg-[#D9D9D9]">
            <div className="text-center">
                <p className="text-[#707070] text-sm mb-2 font-sans">{message}</p>
                <button
                    onClick={onSwitch}
                    className="px-4 py-2 bg-[#5180C1] text-white rounded-lg text-sm font-medium hover:bg-[#4070B0] transition-colors font-sans"
                >
                    Switch to 2D
                </button>
            </div>
        </div>
    );
}

interface OpenArcade3DViewProps {
    configClient: IConfigClient | null;
    onDisconnect?: (() => void) | (() => Promise<void>);
    liteMode?: boolean;
}

const OpenArcade3DView = memo(function OpenArcade3DView({
    configClient,
    liteMode = false,
}: OpenArcade3DViewProps) {
    const {
        selectedButton,
        setSelectedButton,
        activeSection,
        mappingFilter,
        setMappingFilter,
        isMappingMode,
        armedButton,
        mappingStatus,
        pressedButtons,
        profilesRefreshKey,
        showOnlyConnected,
        isRefreshing,
        modules,
        activeProfile,
        editingMode,
        setEditingMode,
        viewMode,
        safeCurrentModuleIndex,
        currentModule,
        currentMappings,
        visibleModules,
        activeClient,
        handleRefreshDevices,
        handleRenameDevice,
        triggerProfileRefresh,
        handleSectionChange,
        toggleViewMode,
        toggleMappingMode,
        handleButtonClick,
        handleModuleChange,
        navigatePrev,
        navigateNext,
        saveMapping,
        clearMapping,
        clearAllMappings,
        saveToDevice,
        toggleConnectedFilter,
        refreshDevices,
        applyDeviceConfigs,
    } = useOpenArcade({ configClient, liteMode, initialViewMode: '2d' });

    const cameraControl = useCameraController({ 
        currentModuleIndex: safeCurrentModuleIndex, 
        modules, 
        enabled: viewMode === '3d' 
    });

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
                modules={modules.map(m => ({ 
                    ...m, 
                    mappedButtons: Object.keys(m.mappingBanks?.[editingMode] || {}).length 
                }))}
                onModuleChange={handleModuleChange}
                isConnected={modules.some((module) => module.connected !== false)}
                viewMode={viewMode}
                mappingFilter={mappingFilter}
                onMappingFilterChange={setMappingFilter}
                onToggleView={toggleViewMode}
                showOnlyConnected={showOnlyConnected}
                onToggleConnectedFilter={toggleConnectedFilter}
                onRenameDevice={handleRenameDevice}
                onRefreshDevices={handleRefreshDevices}
                isRefreshing={isRefreshing}
                showViewToggle={!liteMode}
            />

            <div className="flex flex-1 min-h-0">
                <div className="w-[72px] bg-[#CCCCCC] flex flex-col items-center pt-5 gap-2 shrink-0 border-r border-black/10 shadow-[1px_0_3px_rgba(0,0,0,0.04)]">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleSectionChange(item.id)}
                            className={`group relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer border-none
                                ${activeSection === item.id ? "bg-[#5180C1]/15" : "bg-transparent hover:bg-[#B8B8B8]"}`}
                            title={item.label}
                        >
                            <item.Icon active={activeSection === item.id} />
                            {activeSection === item.id && (
                                <div className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#5180C1] rounded-r-full shadow-[2px_0_8px_rgba(81,128,193,0.35)]" />
                            )}
                        </button>
                    ))}

                    <div className="w-8 h-px bg-[#A0A0A0] my-2" />

                    <div className="mt-auto mb-4">
                        <div className="text-[9px] text-[#707070] font-medium tracking-wider text-center leading-tight font-mono">
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
                                camera={viewMode === '3d' 
                                    ? { position: [0, 1.5, 3], fov: 45 } 
                                    : { position: [0, 5, 0], rotation: [-Math.PI / 2, 0, 0], zoom: 25 }
                                }
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
                                <directionalLight position={[-8, 6, 4]} intensity={0.4} color="#E8E0F0" />
                                <directionalLight position={[0, 3, -10]} intensity={0.45} color="#F0E8E0" />
                                <pointLight position={[3, 4, 3]} intensity={0.3} color="#EDE9FE" distance={15} decay={2} />
                                <pointLight position={[-4, 3, -2]} intensity={0.2} color="#FEF3E8" distance={12} decay={2} />

                                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
                                    <planeGeometry args={[50, 50]} />
                                    <shadowMaterial opacity={0.08} />
                                </mesh>

                                <gridHelper args={[40, 40, "#E4E0DC", "#EBE8E4"]} position={[0, -0.15, 0]} />
                                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]}>
                                    <planeGeometry args={[40, 40, 40, 40]} />
                                    <meshBasicMaterial color="#D4D0CC" wireframe transparent opacity={0.12} />
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
                                                onModuleClick={() => handleModuleChange(globalIndex)}
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
                                        className={`absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-xl bg-[#CCCCCC]/90 backdrop-blur-sm border border-[#A0A0A0] transition-all duration-200 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.1)] ${
                                            !hasPrev ? "opacity-30 cursor-default" : "hover:bg-[#CCCCCC] hover:border-[#5180C1]/40 hover:shadow-lg active:scale-95"
                                        }`}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="15 18 9 12 15 6" />
                                        </svg>
                                    </button>

                                    <button
                                        onClick={navigateNext}
                                        disabled={!hasNext}
                                        className={`absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-xl bg-[#CCCCCC]/90 backdrop-blur-sm border border-[#A0A0A0] transition-all duration-200 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.1)] ${
                                            !hasNext ? "opacity-30 cursor-default" : "hover:bg-[#CCCCCC] hover:border-[#5180C1]/40 hover:shadow-lg active:scale-95"
                                        }`}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </button>

                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#CCCCCC]/90 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-[#A0A0A0] shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                                        {visibleModules.map((mod) => {
                                            const globalIndex = modules.indexOf(mod);
                                            return (
                                                <button
                                                    key={mod.deviceId || mod.id}
                                                    onClick={() => handleModuleChange(globalIndex)}
                                                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer border-none ${
                                                        globalIndex === safeCurrentModuleIndex ? "bg-[#5180C1]/15" : "bg-transparent hover:bg-[#B8B8B8]"
                                                    }`}
                                                >
                                                    <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                                        globalIndex === safeCurrentModuleIndex 
                                                            ? "bg-[#5180C1] scale-110 shadow-[0_0_8px_rgba(81,128,193,0.5)]" 
                                                            : "bg-[#707070]"
                                                    }`} />
                                                    <span className={`text-xs font-medium whitespace-nowrap transition-colors duration-200 ${
                                                        globalIndex === safeCurrentModuleIndex ? "text-[#333333]" : "text-[#707070]"
                                                    } font-sans`}>
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
                        <SwitchTo2DNotice
                            message="Profiles are managed in 2D view"
                            onSwitch={toggleViewMode}
                        />
                    )
                ) : (
                    viewMode === '2d' ? (
                        <LiveInputPanel />
                    ) : (
                        <SwitchTo2DNotice
                            message="Live Input is available in 2D view"
                            onSwitch={toggleViewMode}
                        />
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
                        preferredInputType={editingMode === "keyboard" ? HID_INPUT_TYPES.KEYBOARD : HID_INPUT_TYPES.GAMEPAD}
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
