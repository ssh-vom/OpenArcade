import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ChildModule } from "./ChildModule.jsx";
import { useState, useEffect } from "react";
import ButtonMappingModal from "./ButtonMappingModal.jsx";
import ButtonMappingsPanel from "./ButtonMappingsPanel.jsx";
import ControllerHUD from "./ControllerHUD.jsx";

export function OpenArcade3DView() {
    const [selectedButton, setSelectedButton] = useState(null);
    const [modules, setModules] = useState([
        { id: 1, name: "Module A", path: "/OAColouredButtons.glb", mappings: {} },
        { id: 2, name: "Module B", path: "/OAColouredButtons.glb", mappings: {} },
        { id: 3, name: "Module C", path: "/OAColouredButtons.glb", mappings: {} },
    ]);
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setLoaded(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const currentModule = modules[currentModuleIndex];
    const currentMappings = currentModule.mappings;

    const handleButtonClick = (buttonName, mesh) => {
        setSelectedButton({ name: buttonName, mesh, action: currentMappings[buttonName] || "" });
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
                    shadows
                    camera={{ position: [0, 2, 5], fov: 45 }}
                    style={{ background: "#0a0a0a", width: "100%", height: "100%" }}
                >

                    {/* --- Lights --- */}

                    <ambientLight intensity={1.5} />

                    {/* Key Light */}
                    <directionalLight
                        position={[4, 10, 6]}
                        intensity={2}
                        castShadow
                    />

                    {/* Fill Light */}
                    <directionalLight
                        position={[-6, 8, 4]}
                        intensity={1}
                    />

                    {/* Rim Light */}
                    <directionalLight
                        position={[0, 5, -6]}
                        intensity={1}
                    />
                    <ChildModule 
                        path={currentModule.path} 
                        onButtonClick={handleButtonClick} 
                        key={`module-${currentModule.id}`}
                    />
                    <OrbitControls />
                </Canvas>
            </div>

            {/* Right Sidebar (Inspector) */}
            <ButtonMappingsPanel 
                mappings={currentMappings} 
                moduleName={currentModule.name}
                onSelectButton={handleButtonClick} 
            />

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
}

