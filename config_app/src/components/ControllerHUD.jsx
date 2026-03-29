import { useLayoutEffect, useState } from "react";
import { HID_INPUT_TYPES } from "../services/HIDManager.js";

const oaBlockLogo = "/logos/oa_block.png";

export default function ControllerHUD({
    moduleCount,
    currentModule,
    modules,
    onModuleChange,
    isConnected,
    viewMode,
    mappingFilter,
    onMappingFilterChange,
    onToggleView,
    showOnlyConnected,
    onToggleConnectedFilter,
    onRenameDevice,
}) {
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState("");

    const filterOptions = [
        { value: "all", label: "All", icon: null },
        { value: HID_INPUT_TYPES.KEYBOARD, label: "KB", color: "#4A90A4" },
        { value: HID_INPUT_TYPES.GAMEPAD, label: "GP", color: "#5180C1" },
        { value: HID_INPUT_TYPES.ANALOG, label: "AX", color: "#6B9BD1" },
    ];

    const activeModule = modules[currentModule];
    const dropdownModules = showOnlyConnected
        ? modules.map((m, i) => ({ ...m, originalIndex: i })).filter((m) => m.connected !== false)
        : modules.map((m, i) => ({ ...m, originalIndex: i }));

    const handleConfirmRename = () => {
        if (nameValue.trim() && activeModule?.deviceId) {
            onRenameDevice(activeModule.deviceId, nameValue.trim());
        }
        setEditingName(false);
    };

    useLayoutEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- useLayoutEffect is correct for synchronous UI reset
        setEditingName(false);
    }, [currentModule]);

    return (
        <div
            className="w-full h-[72px] bg-[#D9D9D9]/90 backdrop-blur-xl flex items-center justify-between px-6 z-10 shrink-0 relative"
            style={{
                borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}
        >
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-4">
                <div
                    className="w-11 h-11 bg-gradient-to-br from-[#5180C1] to-[#4070B0] rounded-xl flex items-center justify-center"
                    style={{ boxShadow: '0 2px 8px rgba(81, 128, 193, 0.2)' }}
                >
                    <img
                        src={oaBlockLogo}
                        alt="OpenArcade"
                        className="w-7 h-7 invert"
                    />
                </div>
                <div>
                    <div
                        className="text-[#333333] font-semibold text-[15px] tracking-tight"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        OpenArcade
                    </div>
                    <div
                        className="text-[#707070] text-[11px] mt-0.5 tracking-wide"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        {moduleCount} module{moduleCount === 1 ? "" : "s"} connected
                    </div>
                </div>
            </div>

            {/* Center: Module Selector */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
                <div className="flex flex-col items-start gap-1">
                    <span
                        className="text-[10px] font-semibold text-[#707070] uppercase tracking-[0.12em]"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        Active Module
                    </span>
                    <select
                        value={String(currentModule)}
                        onChange={(e) => onModuleChange(Number(e.target.value))}
                        className="min-w-[240px] px-4 py-2 bg-[#CCCCCC] hover:bg-[#C0C0C0] border border-[#A0A0A0] rounded-xl text-[#333333] text-sm outline-none appearance-none transition-all duration-150 cursor-pointer"
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23707070' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            paddingRight: '40px'
                        }}
                    >
                        {dropdownModules.map((module) => {
                            const shortId = module.deviceId ? module.deviceId.slice(-8) : "";
                            const dot = module.connected !== false ? "● " : "○ ";
                            const status = module.connected !== false ? "online" : "offline";
                            const label = dot + module.name + (shortId ? "  " + shortId : "") + "  " + status;
                            return (
                                <option key={module.id} value={module.originalIndex}>
                                    {label}
                                </option>
                            );
                        })}
                    </select>
                    {editingName ? (
                        <div className="flex items-center gap-1.5 mt-1">
                            <input
                                autoFocus
                                value={nameValue}
                                onChange={(e) => setNameValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") { handleConfirmRename(); }
                                    if (e.key === "Escape") { setEditingName(false); }
                                }}
                                className="text-xs px-2 py-1 rounded-lg border border-[#5180C1]/40 outline-none focus:border-[#5180C1] bg-[#D9D9D9] text-[#333333]"
                                style={{ fontFamily: "'DM Sans', sans-serif", minWidth: 160 }}
                                placeholder="Device nickname..."
                                maxLength={32}
                            />
                            <button onClick={handleConfirmRename} className="text-xs px-2 py-1 rounded-lg bg-[#5180C1] text-white font-medium hover:bg-[#4070B0] transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                Save
                            </button>
                            <button onClick={() => setEditingName(false)} className="text-xs px-2 py-1 rounded-lg text-[#555555] hover:text-[#333333] transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setNameValue(activeModule?.name || ""); setEditingName(true); }}
                            className="flex items-center gap-1 mt-1 text-[10px] text-[#707070] hover:text-[#5180C1] transition-colors group"
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Rename
                        </button>
                    )}
                </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onToggleConnectedFilter}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all duration-200"
                    style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        background: showOnlyConnected ? "rgba(16,185,129,0.08)" : "#CCCCCC",
                        borderColor: showOnlyConnected ? "rgba(16,185,129,0.3)" : "#A0A0A0",
                        color: showOnlyConnected ? "#10B981" : "#555555",
                    }}
                    title={showOnlyConnected ? "Showing connected only — click to show all" : "Showing all devices — click to show connected only"}
                >
                    Filter:
                    <span>{showOnlyConnected ? "Online" : "All"}</span>
                </button>

                {/* Connection Status */}
                <div
                    className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold rounded-full border transition-all duration-200
                        ${isConnected
                            ? 'bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]'
                            : 'bg-[#FEF2F2] text-[#EF4444] border-[#FECACA]'
                        }`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.05em' }}
                >
                    <div
                        className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}
                        style={isConnected ? {
                            animation: 'pulse-dot 2s infinite',
                            boxShadow: '0 0 6px rgba(16, 185, 129, 0.5)'
                        } : {}}
                    />
                    {isConnected ? "ONLINE" : "OFFLINE"}
                </div>

                {/* Mapping Filter (2D only) */}
                {viewMode === "2d" && (
                    <div
                        className="flex items-center gap-1 p-1 bg-[#CCCCCC] rounded-xl border border-[#A0A0A0]"
                    >
                        {filterOptions.map((option) => {
                            const isActive = mappingFilter === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => onMappingFilterChange(option.value)}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer border-none
                                        ${isActive
                                            ? 'bg-[#D9D9D9] text-[#333333] shadow-sm'
                                            : 'bg-transparent text-[#707070] hover:text-[#333333]'
                                        }`}
                                    style={{
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        color: isActive && option.color ? option.color : undefined
                                    }}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* View Toggle */}
                <button
                    onClick={onToggleView}
                    className="group flex items-center gap-2 px-4 py-2 bg-[#CCCCCC] hover:bg-[#C0C0C0] text-[#333333] hover:text-[#333333] border border-[#A0A0A0] rounded-xl text-[12px] font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                    {viewMode === "3d" ? (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:scale-110">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            2D View
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:scale-110">
                                <path d="M12 3L2 7.5l10 4.5 10-4.5L12 3z" />
                                <path d="M2 17.5l10 4.5 10-4.5" />
                                <path d="M2 12.5l10 4.5 10-4.5" />
                            </svg>
                            3D View
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
