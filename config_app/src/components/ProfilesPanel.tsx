import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import PlateGalleryPanel from "./PlateGalleryPanel";
import PlateTopPreview from "./PlateTopPreview";
import { DEFAULT_PLATE_ID, PLATES, getPlateId, getPlateName } from "../lib/plateCatalog";

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
    
    const hasLoadedRef = useRef(false);
    const prevDeviceIdRef = useRef(deviceId);
    const prevRefreshKeyRef = useRef(refreshKey);

    const loadProfiles = useCallback(async () => {
        if (!deviceId || !configClient?.listProfiles) {
            setProfiles([]);
            hasLoadedRef.current = true;
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
            hasLoadedRef.current = true;
        }
    }, [deviceId, configClient]);

    // Load profiles when deviceId or refreshKey changes
    useEffect(() => {
        const needsLoad = !hasLoadedRef.current || 
            deviceId !== prevDeviceIdRef.current || 
            refreshKey !== prevRefreshKeyRef.current;
        
        if (needsLoad) {
            prevDeviceIdRef.current = deviceId;
            prevRefreshKeyRef.current = refreshKey;
            loadProfiles();
        }
    }, [deviceId, refreshKey, loadProfiles]);

    const plateNameById = useMemo(() => {
        const map = new Map();
        PLATES.forEach((plate) => {
            map.set(plate.id, plate.name);
            (plate.legacy_ids || []).forEach((legacyId) => map.set(legacyId, plate.name));
        });
        return map;
    }, []);

    const handleCreateProfile = async () => {
        if (!deviceId || !configClient?.createProfile) {
            return;
        }

        const name = `Profile ${profiles.length + 1}`;

        try {
            await configClient.createProfile(
                deviceId,
                name,
                getPlateId(activeProfile?.plate_id || DEFAULT_PLATE_ID),
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

            <div className="relative z-[1] flex-1 min-h-0 overflow-y-auto py-4">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center min-h-[200px]">
                        <div className="w-5 h-5 border-2 border-[#5180C1] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full px-4">
                        {profiles.map((profile, index) => {
                            const isActive = profile.id === activeProfile?.id;
                            const plateName = plateNameById.get(profile.plate_id) || getPlateName(profile.plate_id);
                            const isSwitching = switchingId === profile.id;
                            const isDeleting = deletingId === profile.id;

                            return (
                                <div
                                    key={profile.id}
                                    className="flex flex-col plate-card-animate group cursor-pointer"
                                    style={{ "--stagger": index }}
                                    onClick={() => !isActive && handleSwitch(profile.id)}
                                >
                                    <div className={`preview-thumb ${isActive ? 'preview-thumb-selected' : ''}`}>
                                        <PlateTopPreview
                                            plateId={profile.plate_id}
                                            alt=""
                                        />
                                    </div>

                                    <div className="pt-2.5 flex flex-col gap-1">
                                        <div className="flex items-center gap-2 min-w-0">
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
                                                    className="text-sm font-medium text-[#333333] bg-[#E5E5E5] border-0 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-[#5180C1]/30 min-w-0 flex-1"
                                                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                                />
                                            ) : (
                                                <button
                                                    type="button"
                                                    onDoubleClick={() => {
                                                        setRenamingId(profile.id);
                                                        setRenameValue(profile.name || "");
                                                    }}
                                                    className="text-sm font-medium text-[#333333] truncate text-left min-w-0 hover:text-[#5180C1] transition-colors"
                                                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                                    title="Double-click to rename"
                                                >
                                                    {profile.name}
                                                </button>
                                            )}

                                            {isActive && (
                                                <span className="badge-active">Active</span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between gap-2">
                                            <span className="meta-text truncate" title={plateName}>
                                                {plateName}
                                            </span>

                                            <div className="action-group">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingProfileId(profile.id);
                                                        setView("gallery");
                                                    }}
                                                    className="action-link"
                                                >
                                                    Change
                                                </button>
                                                <span className="action-group-separator">·</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(profile.id);
                                                    }}
                                                    disabled={profiles.length <= 1 || isDeleting}
                                                    className="action-link-danger disabled:opacity-40 disabled:cursor-not-allowed"
                                                    aria-label="Delete"
                                                >
                                                    {isDeleting ? "…" : "Delete"}
                                                </button>
                                            </div>
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
