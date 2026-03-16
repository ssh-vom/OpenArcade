import oaLogo from "../assets/oa-logo.svg";
import { HID_INPUT_TYPES } from "../services/HIDManager.js";

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
        { value: "all", label: "All" },
        { value: HID_INPUT_TYPES.KEYBOARD, label: "KB" },
        { value: HID_INPUT_TYPES.GAMEPAD, label: "GP" },
        { value: HID_INPUT_TYPES.ANALOG, label: "AX" },
    ];

    return (
        <div className="w-full h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200 flex items-center justify-between px-5 z-10 shrink-0">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                    <img
                        src={oaLogo}
                        alt="OpenArcade"
                        className="w-6 h-6"
                    />
                </div>
                <div>
                    <div className="text-gray-900 font-semibold text-sm tracking-tight">
                        OpenArcade
                    </div>
                    <div className="text-gray-400 text-[11px]">
                        {controllerName} · {moduleCount} module{moduleCount === 1 ? "" : "s"}
                    </div>
                </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3">
                {/* Module Selector */}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                        Active Module
                    </span>
                    <select
                        value={String(currentModule)}
                        onChange={(e) => onModuleChange(Number(e.target.value))}
                        className="min-w-[220px] px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-xs outline-none appearance-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/10 transition-colors cursor-pointer"
                    >
                        {modules.map((module, index) => {
                            const status = module.connected === false ? "offline" : "online";
                            const deviceLabel = module.deviceId ? ` · ${module.deviceId}` : "";
                            const label = `${module.name}${deviceLabel} · ${status}`;
                            return (
                                <option key={module.id} value={index}>
                                    {label}
                                </option>
                            );
                        })}
                    </select>
                </div>

                {/* Connection Status */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border
                    ${isConnected
                        ? 'bg-green-50 text-green-600 border-green-200'
                        : 'bg-red-50 text-red-500 border-red-200'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full bg-current ${isConnected ? 'animate-[pulse-dot_2s_infinite]' : ''}`} />
                    {isConnected ? "Online" : "Offline"}
                </div>

                {/* Mapping Filter (2D only) */}
                {viewMode === "2d" && (
                    <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-lg">
                        {filterOptions.map((option) => {
                            const isActive = mappingFilter === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => onMappingFilterChange(option.value)}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer border-none
                                        ${isActive
                                            ? 'bg-white text-[#0071E3] shadow-sm'
                                            : 'bg-transparent text-gray-400 hover:text-gray-600'
                                        }`}
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
                    className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 border-none rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer"
                >
                    {viewMode === "3d" ? "2D View" : "3D View"}
                </button>
            </div>
        </div>
    );
}
