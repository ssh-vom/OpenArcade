import { useCallback, useEffect, useMemo, useState } from "react";
import PlateGalleryPanel from "./PlateGalleryPanel.jsx";
import PlateTopPreview from "./PlateTopPreview.jsx";
import plateCatalog from "@shared/plate_catalog.json";

const PLATES = plateCatalog.plates;

function TrashIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
    );
}

export default function ProfilesPanel({
    deviceId,
    configClient,
    activeProfile,
    onProfileChanged,
    refreshKey = 0,
}) {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState("list");
    const [editingProfileId, setEditingProfileId] = useState(null);
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState("");
    const [switchingId, setSwitchingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const plateNameById = useMemo(() => {
        const map = new Map();
        PLATES.forEach((plate) => map.set(plate.id, plate.name));
        return map;
    }, []);

    const loadProfiles = useCallback(async () => {
        if (!deviceId || !configClient?.listProfiles) {
            setProfiles([]);
            return;
        }

        setLoading(true);
        try {
            const loadedProfiles = await configClient.listProfiles(deviceId);
            setProfiles(Array.isArray(loadedProfiles) ? loadedProfiles : []);
        } catch (error) {
            console.warn("Failed to load profiles", error);
            setProfiles([]);
        } finally {
            setLoading(false);
        }
    }, [deviceId, configClient]);

    useEffect(() => {
        loadProfiles();
    }, [loadProfiles, deviceId, refreshKey]);

    const handleCreateProfile = async () => {
        if (!deviceId || !configClient?.createProfile) {
            return;
        }

        const name = `Profile ${profiles.length + 1}`;

        try {
            await configClient.createProfile(
                deviceId,
                name,
                activeProfile?.plate_id || "button-module-v1",
            );
            await loadProfiles();
            onProfileChanged?.();
        } catch (error) {
            console.warn("Failed to create profile", error);
        }
    };

    const handleSwitch = async (profileId) => {
        if (!deviceId || !configClient?.setActiveProfile) {
            return;
        }

        try {
            setSwitchingId(profileId);
            await configClient.setActiveProfile(deviceId, profileId);
            await loadProfiles();
            onProfileChanged?.();
        } catch (error) {
            console.warn("Failed to switch profile", error);
        } finally {
            setSwitchingId(null);
        }
    };

    const handleDelete = async (profileId) => {
        if (!deviceId || !configClient?.deleteProfile || profiles.length <= 1) {
            return;
        }

        try {
            setDeletingId(profileId);
            await configClient.deleteProfile(deviceId, profileId);
            await loadProfiles();
            onProfileChanged?.();
        } catch (error) {
            console.warn("Failed to delete profile", error);
        } finally {
            setDeletingId(null);
        }
    };

    const handleRenameProfile = async (profileId, name) => {
        const trimmed = name.trim();
        setRenamingId(null);

        if (!trimmed || !deviceId || !configClient?.renameProfile) {
            return;
        }

        try {
            await configClient.renameProfile(deviceId, profileId, trimmed);
            await loadProfiles();
            onProfileChanged?.();
        } catch (error) {
            console.warn("Failed to rename profile", error);
        }
    };

    const editingProfile = profiles.find((p) => p.id === editingProfileId);

    if (view === "gallery") {
        return (
            <div className="h-full flex-1 min-w-0 min-h-0 flex flex-col plate-panel-enter">
            <PlateGalleryPanel
                deviceId={deviceId}
                currentPlateId={editingProfile?.plate_id ?? null}
                currentProfileId={editingProfileId}
                configClient={configClient}
                onBack={() => {
                    setEditingProfileId(null);
                    setView("list");
                }}
                onPlateSelected={() => {
                    setEditingProfileId(null);
                    setView("list");
                    onProfileChanged?.();
                }}
            />
            </div>
        );
    }

    return (
        <div
            className="h-full flex-1 min-w-0 min-h-0 flex flex-col relative overflow-hidden animate-fade-in"
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

            <div
                className="relative z-[1] shrink-0 h-16 border-b border-[#A0A0A0] px-4 flex items-center justify-between"
                style={{ background: "rgba(204, 204, 204, 0.95)" }}
            >
                <div className="min-w-0">
                    <h2
                        className="text-base font-semibold text-[#333333] leading-tight"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        Profiles
                    </h2>
                    <div
                        className="text-xs text-[#707070] truncate mt-1"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        title={deviceId || "No device selected"}
                    >
                        {deviceId || "No device"}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleCreateProfile}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium border border-[#5180C1]/50 text-[#5180C1] hover:bg-[#5180C1]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    disabled={!deviceId || !configClient?.createProfile}
                >
                    New Profile
                </button>
            </div>

            <div className="relative z-[1] flex-1 min-h-0 overflow-y-auto px-4 py-4">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center min-h-[200px]">
                        <div className="w-5 h-5 border-2 border-[#5180C1] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {profiles.map((profile, index) => {
                            const isActive = profile.id === activeProfile?.id;
                            const plateName = plateNameById.get(profile.plate_id) || profile.plate_id;
                            const isSwitching = switchingId === profile.id;
                            const isDeleting = deletingId === profile.id;

                            return (
                                <div
                                    key={profile.id}
                                    className="rounded-xl overflow-hidden flex flex-col plate-card-animate card-interactive transition-[box-shadow,border-color] duration-300 ease-out"
                                    style={{
                                        "--stagger": index,
                                        background: "#CCCCCC",
                                        border: `1px solid ${isActive ? "#5180C1" : "#A0A0A0"}`,
                                        boxShadow: isActive
                                            ? "0 6px 18px rgba(81, 128, 193, 0.2)"
                                            : "0 1px 3px rgba(0, 0, 0, 0.1)",
                                    }}
                                >
                                    <div className="aspect-[4/3] bg-[#B8B8B8] flex items-center justify-center p-3 border-b border-[#A0A0A0] shrink-0">
                                        <PlateTopPreview
                                            plateId={profile.plate_id}
                                            alt=""
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    </div>

                                    <div className="p-3 flex flex-col gap-2 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center min-w-0 flex-1">
                                                {isActive && <span className="w-2 h-2 rounded-full bg-[#5180C1] inline-block mr-2 shrink-0 mt-1.5" />}

                                                {renamingId === profile.id ? (
                                                    <input
                                                        autoFocus
                                                        value={renameValue}
                                                        onChange={(event) => setRenameValue(event.target.value)}
                                                        onBlur={() => handleRenameProfile(profile.id, renameValue)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === "Enter") {
                                                                event.preventDefault();
                                                                event.currentTarget.blur();
                                                            }
                                                            if (event.key === "Escape") {
                                                                event.preventDefault();
                                                                setRenamingId(null);
                                                            }
                                                        }}
                                                        className="text-sm font-semibold text-[#333333] bg-transparent border border-[#909090] rounded-md px-1.5 py-0.5 outline-none focus:border-[#5180C1] min-w-0 w-full"
                                                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                                    />
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onDoubleClick={() => {
                                                            setRenamingId(profile.id);
                                                            setRenameValue(profile.name || "");
                                                        }}
                                                        className="text-sm font-semibold text-[#333333] truncate text-left"
                                                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                                        title="Double-click to rename"
                                                    >
                                                        {profile.name}
                                                    </button>
                                                )}

                                                {isActive && (
                                                    <span
                                                        className="ml-2 shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[#5180C1]/15 text-[#5180C1]"
                                                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                                    >
                                                        Active
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                {!isActive && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSwitch(profile.id)}
                                                        disabled={isSwitching || isDeleting}
                                                        className="text-xs font-medium text-[#5180C1] px-2 py-1 rounded-lg hover:bg-[#5180C1]/10 border border-[#5180C1]/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                                    >
                                                        {isSwitching ? "Switching…" : "Switch"}
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(profile.id)}
                                                    disabled={profiles.length <= 1 || isDeleting || isSwitching}
                                                    className="text-[#707070] hover:text-[#EF4444] p-1 rounded-lg hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                    aria-label="Delete profile"
                                                >
                                                    {isDeleting ? (
                                                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <TrashIcon />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap mt-auto">
                                            <span
                                                className="inline-flex items-center rounded-full bg-[#B8B8B8] text-[#4A4A4A] text-[11px] px-2 py-0.5"
                                                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                            >
                                                {plateName}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingProfileId(profile.id);
                                                    setView("gallery");
                                                }}
                                                className="text-[11px] text-[#5180C1] ml-auto underline-offset-2 hover:underline"
                                                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                            >
                                                Change plate →
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
