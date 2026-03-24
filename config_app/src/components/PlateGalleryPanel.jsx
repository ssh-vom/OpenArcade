import { useState } from "react";
import plateCatalog from "@shared/plate_catalog.json";
import PlateTopPreview from "./PlateTopPreview.jsx";

const PLATES = plateCatalog.plates;

function PlateCard({ plate, isSelected, isLoading, onClick, staggerIndex = 0 }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isLoading}
            className="relative text-left rounded-xl overflow-hidden plate-card-animate transition-shadow duration-300 ease-out hover:shadow-lg"
            style={{
                "--stagger": staggerIndex,
                border: `1.5px solid ${isSelected ? plate.accent_color : "#A0A0A0"}`,
                background: "#CCCCCC",
                boxShadow: isSelected
                    ? `0 8px 24px color-mix(in srgb, ${plate.accent_color} 30%, transparent)`
                    : "0 1px 3px rgba(0, 0, 0, 0.1)",
                opacity: isLoading ? 0.9 : 1,
                cursor: isLoading ? "wait" : "pointer",
            }}
        >
            <div className="h-40 bg-[#B8B8B8] flex items-center justify-center p-2 border-b border-[#A0A0A0]">
                <PlateTopPreview
                    plateId={plate.id}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                />
            </div>

            <div className="px-3.5 pb-3.5 pt-3">
                <div
                    className="text-sm font-semibold text-[#333333]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                    {plate.name}
                </div>
                <div
                    className="mt-1 text-xs text-[#4A4A4A] leading-relaxed"
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
                <div className="absolute inset-0 bg-[#CCCCCC]/80 flex items-center justify-center">
                    <div
                        className="w-5 h-5 rounded-full border-2 border-[#5180C1] border-t-transparent animate-spin"
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
            className="h-full flex-1 min-w-0 min-h-0 flex flex-col relative overflow-hidden"
            style={{ background: "linear-gradient(180deg, #D9D9D9 0%, #CCCCCC 100%)" }}
        >
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `
                        linear-gradient(rgba(81, 128, 193, 0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(81, 128, 193, 0.04) 1px, transparent 1px)
                    `,
                    backgroundSize: "32px 32px",
                }}
            />

            <div className="sticky top-0 z-10 px-4 pt-3 pb-2" style={{ background: "linear-gradient(180deg, #D9D9D9 0%, #D0D0D0 100%)" }}>
                <div className="flex items-center gap-3 h-10">
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-8 h-8 rounded-lg border border-[#A0A0A0] bg-[#CCCCCC] flex items-center justify-center text-[#4A4A4A] hover:text-[#333333] transition-colors"
                        aria-label="Back"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <div>
                        <h2
                            className="text-lg font-semibold text-[#333333] leading-tight"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                            Select Plate
                        </h2>
                        <p
                            className="text-xs text-[#4A4A4A]"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                            Choose the physical controller layout
                        </p>
                    </div>
                </div>
            </div>

            <div className="relative z-[1] flex-1 overflow-y-auto panel-scroll px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                    {PLATES.map((plate, index) => {
                        const isSelected = plate.id === currentPlateId;
                        const isLoading = selectedLoadingId === plate.id;

                        return (
                            <PlateCard
                                key={plate.id}
                                plate={plate}
                                staggerIndex={index}
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
