import { HID_INPUT_TYPES } from "../services/HIDManager.js";

// Use the new block logo from public folder
const oaBlockLogo = "/oa_block.png";

export default function ControllerHUD({
    controllerName,
    moduleCount,
    currentModule,
    modules,
    onModuleChange,
    isConnected,
    viewMode,
    mappingFilter,
    onMappingFilterChange,
    onToggleView,
}) {
    const filterOptions = [
        { value: "all", label: "All", icon: null },
        { value: HID_INPUT_TYPES.KEYBOARD, label: "KB", color: "#06B6D4" },
        { value: HID_INPUT_TYPES.GAMEPAD, label: "GP", color: "#7C3AED" },
        { value: HID_INPUT_TYPES.ANALOG, label: "AX", color: "#F97316" },
    ];

    return (
        <div 
            className="w-full h-[72px] bg-white/90 backdrop-blur-xl flex items-center justify-between px-6 z-10 shrink-0 relative"
            style={{
                borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
            }}
        >
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-4">
                <div 
                    className="w-11 h-11 bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] rounded-xl flex items-center justify-center"
                    style={{ boxShadow: '0 2px 8px rgba(124, 58, 237, 0.2)' }}
                >
                    <img
                        src={oaBlockLogo}
                        alt="OpenArcade"
                        className="w-7 h-7 invert"
                    />
                </div>
                <div>
                    <div 
                        className="text-[#18181B] font-semibold text-[15px] tracking-tight"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        OpenArcade
                    </div>
                    <div 
                        className="text-[#A1A1AA] text-[11px] mt-0.5 tracking-wide"
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
                        className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-[0.12em]"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        Active Module
                    </span>
                    <select
                        value={String(currentModule)}
                        onChange={(e) => onModuleChange(Number(e.target.value))}
                        className="min-w-[240px] px-4 py-2 bg-[#F4F4F5] hover:bg-[#E4E4E7] border border-[#E4E4E7] rounded-xl text-[#18181B] text-sm outline-none appearance-none transition-all duration-150 cursor-pointer"
                        style={{ 
                            fontFamily: "'DM Sans', sans-serif",
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23A1A1AA' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            paddingRight: '40px'
                        }}
                    >
                        {modules.map((module, index) => {
                            const status = module.connected === false ? "offline" : "online";
                            const deviceLabel = module.deviceId ? `${module.deviceId}` : "";
                            const label = `${module.name}${deviceLabel ? ` · ${deviceLabel}` : ""} · ${status}`;
                            return (
                                <option key={module.id} value={index}>
                                    {label}
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3">
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
                        className="flex items-center gap-1 p-1 bg-[#F4F4F5] rounded-xl border border-[#E4E4E7]"
                    >
                        {filterOptions.map((option) => {
                            const isActive = mappingFilter === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => onMappingFilterChange(option.value)}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer border-none
                                        ${isActive
                                            ? 'bg-white text-[#18181B] shadow-sm'
                                            : 'bg-transparent text-[#A1A1AA] hover:text-[#52525B]'
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
                    className="group flex items-center gap-2 px-4 py-2 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#52525B] hover:text-[#18181B] border border-[#E4E4E7] rounded-xl text-[12px] font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer"
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
