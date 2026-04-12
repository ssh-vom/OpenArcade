import { useState } from "react";
import { PLATES, getPlateId } from "../lib/plateCatalog";
import PlateTopPreview from "./PlateTopPreview";

function PlateCard({ plate, isSelected, isLoading, onClick, staggerIndex = 0 }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isLoading}
            className="relative text-left plate-card-animate group"
            style={{ "--stagger": staggerIndex, opacity: isLoading ? 0.9 : 1, cursor: isLoading ? "wait" : "pointer" }}
        >
            <div className={`preview-thumb ${isSelected ? '' : 'bg-[#C8C8C8] hover:bg-[#C2C2C2]'}`} style={{ boxShadow: isSelected ? `0 2px 12px color-mix(in srgb, ${plate.accent_color} 25%, transparent)` : undefined }}>
                <PlateTopPreview
                    plateId={plate.id}
                    alt=""
                />
                {isSelected && (
                    <div className="absolute inset-0 rounded-xl ring-2 ring-inset pointer-events-none" style={{ '--tw-ring-color': plate.accent_color }} />
                )}
            </div>

            <div className="pt-2.5 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                    <span
                        className="text-sm font-medium text-[#333333] truncate"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        title={plate.name}
                    >
                        {plate.name}
                    </span>
                    {isSelected && (
                        <span className="badge-active" style={{ backgroundColor: plate.accent_color }}>Active</span>
                    )}
                </div>
                <span
                    className="text-[11px] text-[#707070] leading-snug line-clamp-2"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                    {plate.description}
                </span>
            </div>

            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#CCCCCC]/90 flex items-center justify-center shadow-lg">
                        <div
                            className="w-5 h-5 rounded-full border-2 border-[#5180C1] border-t-transparent animate-spin"
                            aria-label="Saving plate"
                        />
                    </div>
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
    const selectedPlateId = getPlateId(currentPlateId);

    const handleSelect = async (plate) => {
        if (plate.id === selectedPlateId || selectedLoadingId) {
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

            <div className="relative z-[1] flex-1 overflow-y-auto panel-scroll pb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full px-4">
                    {PLATES.map((plate, index) => {
                        const isSelected = plate.id === selectedPlateId;
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
