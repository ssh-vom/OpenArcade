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
    onRefreshDevices,
    isRefreshing,
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
            {/* Left: Logo + Module Selector (grouped together) */}
            <div className="flex items-center gap-4">
                {/* Logo */}
                <div
                    className="w-10 h-10 bg-gradient-to-br from-[#5180C1] to-[#4070B0] rounded-xl flex items-center justify-center shrink-0"
                    style={{ boxShadow: '0 2px 8px rgba(81, 128, 193, 0.2)' }}
                >
                    <img
                        src={oaBlockLogo}
                        alt="OpenArcade"
                        className="w-6 h-6 invert"
                    />
                </div>

                {/* Title + Module Selector */}
                <div className="flex items-center gap-3">
                    <div className="min-w-0">
                        <div
                            className="text-[#333333] font-semibold text-[14px] tracking-tight truncate"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                            OpenArcade
                        </div>
                        <div
                            className="text-[#707070] text-[10px] tracking-wide truncate"
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                            {moduleCount} module{moduleCount === 1 ? "" : "s"}
                        </div>
                    </div>

                    {/* Module Dropdown */}
                    <div className="flex items-center gap-1.5 pl-3 border-l border-[#B8B8B8]">
                        {editingName ? (
                            <div className="flex items-center gap-1.5">
                                <input
                                    autoFocus
                                    value={nameValue}
                                    onChange={(e) => setNameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") { handleConfirmRename(); }
                                        if (e.key === "Escape") { setEditingName(false); }
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg border border-[#5180C1] outline-none focus:ring-2 focus:ring-[#5180C1]/20 bg-[#D9D9D9] text-[#333333] text-sm w-[180px]"
                                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                                    placeholder="Device nickname..."
                                    maxLength={32}
                                />
                                <button 
                                    onClick={handleConfirmRename} 
                                    className="p-1.5 rounded-lg bg-[#5180C1] text-white hover:bg-[#4070B0] transition-colors"
                                    title="Save"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </button>
                                <button 
                                    onClick={() => setEditingName(false)} 
                                    className="p-1.5 rounded-lg text-[#707070] hover:text-[#333333] hover:bg-[#CCCCCC] transition-colors"
                                    title="Cancel"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <>
                                <select
                                    value={String(currentModule)}
                                    onChange={(e) => onModuleChange(Number(e.target.value))}
                                    className="px-3 py-1.5 bg-[#CCCCCC] hover:bg-[#C0C0C0] border border-[#A0A0A0] rounded-lg text-[#333333] text-sm outline-none appearance-none transition-all duration-150 cursor-pointer w-[220px]"
                                    style={{
                                        fontFamily: "'DM Sans', sans-serif",
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23707070' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 10px center',
                                        paddingRight: '32px'
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
                                <button
                                    onClick={() => { setNameValue(activeModule?.name || ""); setEditingName(true); }}
                                    className="p-1.5 rounded-lg text-[#707070] hover:text-[#5180C1] hover:bg-[#5180C1]/10 transition-colors shrink-0"
                                    title="Rename device"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: All Controls (hugging the right) */}
            <div className="flex items-center gap-2">
                {/* Device Actions */}
                <div className="flex items-center gap-1.5 pr-3 border-r border-[#B8B8B8]">
                    {/* Refresh */}
                    <button
                        onClick={onRefreshDevices}
                        disabled={isRefreshing}
                        className="p-1.5 rounded-lg text-[#555555] hover:text-[#5180C1] hover:bg-[#5180C1]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Refresh devices"
                    >
                        <svg 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            className={isRefreshing ? "animate-spin" : ""}
                            style={{ animationDuration: isRefreshing ? "1s" : undefined }}
                        >
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                    </button>

                    {/* Connection Status */}
                    <div
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all duration-200
                            ${isConnected
                                ? 'bg-[#ECFDF5]/50 text-[#10B981] border-[#A7F3D0]'
                                : 'bg-[#FEF2F2]/50 text-[#EF4444] border-[#FECACA]'
                            }`}
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        <div
                            className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}
                            style={isConnected ? { animation: 'pulse-dot 2s infinite' } : {}}
                        />
                        {isConnected ? "Online" : "Offline"}
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={onToggleConnectedFilter}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all duration-200
                            ${showOnlyConnected 
                                ? 'bg-[#ECFDF5]/50 text-[#10B981] border-[#A7F3D0]' 
                                : 'bg-[#CCCCCC] text-[#555555] border-[#A0A0A0] hover:bg-[#C0C0C0]'
                            }`}
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        title={showOnlyConnected ? "Online only" : "All devices"}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        {showOnlyConnected ? "Online" : "All"}
                    </button>
                </div>

                {/* Mapping Filter (2D only) */}
                {viewMode === "2d" && (
                    <div className="flex items-center gap-0.5 p-0.5 bg-[#CCCCCC] rounded-lg border border-[#A0A0A0]">
                        {filterOptions.map((option) => {
                            const isActive = mappingFilter === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => onMappingFilterChange(option.value)}
                                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wide transition-all duration-150 cursor-pointer border-none
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
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#CCCCCC] hover:bg-[#C0C0C0] text-[#333333] border border-[#A0A0A0] rounded-lg text-[11px] font-medium uppercase tracking-wide transition-all duration-200 cursor-pointer"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                    {viewMode === "3d" ? (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            2D
                        </>
                    ) : (
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 3L2 7.5l10 4.5 10-4.5L12 3z" />
                                <path d="M2 17.5l10 4.5 10-4.5" />
                                <path d="M2 12.5l10 4.5 10-4.5" />
                            </svg>
                            3D
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
