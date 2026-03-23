import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, useGLTF } from "@react-three/drei";
import plateCatalog from "@shared/plate_catalog.json";

const PLATES = plateCatalog.plates;

PLATES.forEach((plate) => {
    useGLTF.preload(plate.plate_model);
});

function PlatePreview3D({ modelPath }) {
    const { scene } = useGLTF(modelPath);
    const rootRef = useRef(null);

    const clonedScene = useMemo(() => scene.clone(), [scene]);

    useFrame((_, delta) => {
        if (rootRef.current) {
            rootRef.current.rotation.y += delta * 0.35;
        }
    });

    return (
        <group ref={rootRef}>
            <Bounds fit clip observe margin={1.2}>
                <primitive object={clonedScene} />
            </Bounds>
        </group>
    );
}

function PlateCard({ plate, isSelected, isLoading, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isLoading}
            className="relative text-left rounded-xl overflow-hidden transition-all duration-200"
            style={{
                border: `1.5px solid ${isSelected ? plate.accent_color : "#E4E4E7"}`,
                background: "#FFFFFF",
                boxShadow: isSelected
                    ? `0 8px 24px color-mix(in srgb, ${plate.accent_color} 25%, transparent)`
                    : "0 1px 3px rgba(0, 0, 0, 0.06)",
                opacity: isLoading ? 0.9 : 1,
                cursor: isLoading ? "wait" : "pointer",
            }}
        >
            <div className="h-40">
                <Canvas flat camera={{ position: [0, 0, 3], fov: 45 }}>
                    <ambientLight intensity={0.8} />
                    <directionalLight position={[2, 2, 2]} />
                    <Suspense fallback={null}>
                        <PlatePreview3D modelPath={plate.plate_model} />
                    </Suspense>
                </Canvas>
            </div>

            <div className="px-3.5 pb-3.5 pt-3">
                <div
                    className="text-sm font-semibold text-[#18181B]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                    {plate.name}
                </div>
                <div
                    className="mt-1 text-xs text-[#71717A] leading-relaxed"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                    {plate.description}
                </div>

                {isSelected && (
                    <div
                        className="inline-flex mt-2 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            backgroundColor: `${plate.accent_color}1A`,
                            color: plate.accent_color,
                        }}
                    >
                        Active
                    </div>
                )}
            </div>

            {isLoading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <div
                        className="w-5 h-5 rounded-full border-2 border-[#7C3AED] border-t-transparent animate-spin"
                        aria-label="Saving plate"
                    />
                </div>
            )}
        </button>
    );
}

export default function PlateGalleryPanel({
    deviceId,
    currentPlateId,
    currentProfileId,
    configClient,
    onBack,
    onPlateSelected,
}) {
    const [selectedLoadingId, setSelectedLoadingId] = useState(null);

    const handleSelect = async (plate) => {
        if (plate.id === currentPlateId || selectedLoadingId) {
            return;
        }

        if (!deviceId || !currentProfileId) {
            onPlateSelected?.(plate.id);
            return;
        }

        try {
            setSelectedLoadingId(plate.id);
            await configClient.setProfilePlate(deviceId, currentProfileId, plate.id);
            onPlateSelected?.(plate.id);
        } catch (error) {
            console.warn("Failed to set profile plate", error);
        } finally {
            setSelectedLoadingId(null);
        }
    };

    return (
        <div
            className="h-full flex flex-col relative overflow-hidden"
            style={{ background: "linear-gradient(180deg, #FAFAF8 0%, #F4F4F2 100%)" }}
        >
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `
                        linear-gradient(rgba(124, 58, 237, 0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(124, 58, 237, 0.02) 1px, transparent 1px)
                    `,
                    backgroundSize: "32px 32px",
                }}
            />

            <div className="sticky top-0 z-10 px-4 pt-3 pb-2" style={{ background: "linear-gradient(180deg, #FAFAF8 0%, #F6F6F4 100%)" }}>
                <div className="flex items-center gap-3 h-10">
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-8 h-8 rounded-lg border border-[#E4E4E7] bg-white flex items-center justify-center text-[#52525B] hover:text-[#18181B] transition-colors"
                        aria-label="Back"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <div>
                        <h2
                            className="text-lg font-semibold text-[#18181B] leading-tight"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                            Select Plate
                        </h2>
                        <p
                            className="text-xs text-[#71717A]"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                            Choose the physical controller layout
                        </p>
                    </div>
                </div>
            </div>

            <div className="relative z-[1] flex-1 overflow-y-auto panel-scroll px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                    {PLATES.map((plate) => {
                        const isSelected = plate.id === currentPlateId;
                        const isLoading = selectedLoadingId === plate.id;

                        return (
                            <PlateCard
                                key={plate.id}
                                plate={plate}
                                isSelected={isSelected}
                                isLoading={isLoading}
                                onClick={() => {
                                    if (!isSelected) {
                                        handleSelect(plate);
                                    }
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
