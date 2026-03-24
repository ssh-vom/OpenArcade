import { HID_INPUT_TYPES } from "../services/HIDManager.js";

export default function D2ConfigPanel({
    mappings,
    moduleName,
    onSelectButton,
    onClearAll,
    moduleId,
    onSaveToDevice,
    isConnected = true,
    isMappingMode = false,
    armedButton = null,
    pressedButtons = [],
    onToggleMappingMode,
    mappingStatus = null,
}) {
    const pressedButtonSet = new Set(pressedButtons);

    // Group mappings by input type
    const groupedMappings = Object.entries(mappings).reduce((groups, [buttonName, config]) => {
        const type = config?.type || 'unknown';
        if (!groups[type]) {
            groups[type] = [];
        }
        groups[type].push({ buttonName, config });
        return groups;
    }, {});

    const getTypeIcon = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return 'GP';
            case HID_INPUT_TYPES.KEYBOARD: return 'KB';
            case HID_INPUT_TYPES.ANALOG: return 'AX';
            default: return '—';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return '#7C3AED';
            case HID_INPUT_TYPES.KEYBOARD: return '#06B6D4';
            case HID_INPUT_TYPES.ANALOG: return '#F97316';
            default: return '#A1A1AA';
        }
    };

    const getTypeBgClass = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return { bg: 'rgba(124, 58, 237, 0.08)', border: 'rgba(124, 58, 237, 0.2)', text: '#7C3AED' };
            case HID_INPUT_TYPES.KEYBOARD: return { bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.2)', text: '#06B6D4' };
            case HID_INPUT_TYPES.ANALOG: return { bg: 'rgba(249, 115, 22, 0.08)', border: 'rgba(249, 115, 22, 0.2)', text: '#F97316' };
            default: return { bg: '#F4F4F5', border: '#E4E4E7', text: '#A1A1AA' };
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return 'Gamepad';
            case HID_INPUT_TYPES.KEYBOARD: return 'Keyboard';
            case HID_INPUT_TYPES.ANALOG: return 'Analog';
            default: return 'Unknown';
        }
    };

    return (
        <div 
            className="w-[320px] h-full bg-white flex flex-col shrink-0 animate-slide-in-right"
            style={{
                borderLeft: '1px solid #E4E4E7',
            }}
        >
            {/* Header Section */}
            <div className="p-6 pb-5">
                {/* Label + Title */}
                <div className="mb-5">
                    <div 
                        className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-[0.12em] mb-1.5"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        Configuration
                    </div>
                    <h3 
                        className="m-0 text-xl font-semibold text-[#18181B] tracking-tight"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        {moduleName}
                    </h3>
                </div>

                {/* Device Status */}
                <div 
                    className="px-4 py-3.5 rounded-xl flex items-center gap-3"
                    style={{
                        background: isConnected ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                        border: isConnected ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)'
                    }}
                >
                    <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${isConnected ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}
                        style={isConnected ? { 
                            animation: 'pulse-dot 2s infinite',
                            boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)'
                        } : {}}
                    />
                    <span 
                        className="text-sm font-medium"
                        style={{ 
                            fontFamily: "'DM Sans', sans-serif",
                            color: isConnected ? '#10B981' : '#EF4444'
                        }}
                    >
                        {isConnected ? "Device Connected" : "Device Offline"}
                    </span>
                </div>
            </div>

            {/* Divider */}
            <div className="mx-6 h-px bg-[#F4F4F5]" />

            {/* Mapping Mode Section */}
            <div className="p-6">
                <button
                    onClick={() => onToggleMappingMode && onToggleMappingMode()}
                    className={`w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide border-2 transition-all duration-200 cursor-pointer ${
                        isMappingMode
                            ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                            : 'bg-white text-[#52525B] border-[#E4E4E7] hover:border-[#7C3AED] hover:text-[#7C3AED]'
                    }`}
                    style={{ 
                        fontFamily: "'Space Grotesk', sans-serif",
                        boxShadow: isMappingMode ? '0 4px 16px rgba(124, 58, 237, 0.3)' : 'none'
                    }}
                >
                    {isMappingMode ? 'Exit Mapping Mode' : 'Enter Mapping Mode'}
                </button>

                {/* Instructions card */}
                <div 
                    className="mt-5 rounded-xl px-5 py-4 text-sm leading-relaxed"
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        background: '#FAFAFA',
                        border: '1px solid #F4F4F5',
                        color: '#52525B'
                    }}
                >
                    {isMappingMode ? (
                        armedButton ? (
                            <>
                                Waiting for physical input for{' '}
                                <span 
                                    className="font-semibold px-2 py-1 rounded-md inline-block mt-1"
                                    style={{ 
                                        background: 'rgba(124, 58, 237, 0.1)',
                                        color: '#7C3AED',
                                        fontFamily: "'IBM Plex Mono', monospace"
                                    }}
                                >
                                    {armedButton}
                                </span>
                            </>
                        ) : (
                            "Select a UI button, then press the physical button you want to bind."
                        )
                    ) : (
                        "Enable Mapping Mode to rebind physical controls to UI buttons."
                    )}
                </div>

                {/* Status message */}
                {mappingStatus && (
                    <div 
                        className="mt-4 rounded-xl px-5 py-3.5 text-sm font-medium"
                        style={{
                            fontFamily: "'DM Sans', sans-serif",
                            background: mappingStatus.type === 'error'
                                ? 'rgba(239, 68, 68, 0.08)'
                                : mappingStatus.type === 'success'
                                    ? 'rgba(16, 185, 129, 0.08)'
                                    : 'rgba(6, 182, 212, 0.08)',
                            border: `1px solid ${
                                mappingStatus.type === 'error'
                                    ? 'rgba(239, 68, 68, 0.2)'
                                    : mappingStatus.type === 'success'
                                        ? 'rgba(16, 185, 129, 0.2)'
                                        : 'rgba(6, 182, 212, 0.2)'
                            }`,
                            color: mappingStatus.type === 'error'
                                ? '#EF4444'
                                : mappingStatus.type === 'success'
                                    ? '#10B981'
                                    : '#06B6D4'
                        }}
                    >
                        {mappingStatus.message}
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="mx-6 h-px bg-[#F4F4F5]" />

            {/* Mappings List */}
            <div className="flex-1 p-6 overflow-y-auto panel-scroll">
                {Object.keys(mappings).length === 0 ? (
                    <div 
                        className="py-10 px-6 text-center rounded-2xl"
                        style={{
                            background: '#FAFAFA',
                            border: '2px dashed #E4E4E7'
                        }}
                    >
                        <div 
                            className="text-[10px] tracking-[0.15em] uppercase mb-2 font-semibold text-[#A1A1AA]"
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                            No Mappings
                        </div>
                        <div 
                            className="text-sm text-[#71717A] leading-relaxed"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                            Click a button in the 2D view<br />to configure HID input.
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Type Groups */}
                        {Object.entries(groupedMappings).map(([type, typeMappings]) => {
                            const typeStyles = getTypeBgClass(type);
                            const typeColor = getTypeColor(type);
                            return (
                                <div key={type}>
                                    {/* Type header */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <span
                                            className="inline-flex items-center justify-center w-8 h-7 rounded-lg text-[10px] font-bold tracking-wider"
                                            style={{ 
                                                background: typeStyles.bg,
                                                border: `1px solid ${typeStyles.border}`,
                                                color: typeStyles.text,
                                                fontFamily: "'IBM Plex Mono', monospace"
                                            }}
                                        >
                                            {getTypeIcon(type)}
                                        </span>
                                        <span 
                                            className="text-sm font-semibold"
                                            style={{ 
                                                color: typeColor,
                                                fontFamily: "'Space Grotesk', sans-serif"
                                            }}
                                        >
                                            {getTypeLabel(type)}
                                        </span>
                                        <span 
                                            className="text-[10px] text-[#A1A1AA] bg-[#F4F4F5] px-2.5 py-1 rounded-full font-medium ml-auto"
                                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                        >
                                            {typeMappings.length}
                                        </span>
                                    </div>

                                    {/* Mapping cards */}
                                    <div className="flex flex-col gap-3">
                                        {typeMappings.map(({ buttonName, config }) => {
                                            const isArmed = armedButton === buttonName;
                                            const isPressed = pressedButtonSet.has(buttonName);

                                            return (
                                                <button
                                                    key={buttonName}
                                                    onClick={() => onSelectButton(buttonName, null)}
                                                    className="w-full text-left p-4 rounded-xl cursor-pointer transition-all duration-150 border-none"
                                                    style={{
                                                        background: isArmed
                                                            ? 'rgba(6, 182, 212, 0.08)'
                                                            : isPressed
                                                                ? 'rgba(16, 185, 129, 0.08)'
                                                                : '#FAFAFA',
                                                        border: isArmed
                                                            ? '2px solid rgba(6, 182, 212, 0.3)'
                                                            : isPressed
                                                                ? '2px solid rgba(16, 185, 129, 0.3)'
                                                                : '1px solid #E4E4E7',
                                                        boxShadow: (isArmed || isPressed)
                                                            ? `0 0 0 3px ${isArmed ? 'rgba(6, 182, 212, 0.1)' : 'rgba(16, 185, 129, 0.1)'}`
                                                            : 'none'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isArmed && !isPressed) {
                                                            e.currentTarget.style.background = '#FFFFFF';
                                                            e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.3)';
                                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isArmed && !isPressed) {
                                                            e.currentTarget.style.background = '#FAFAFA';
                                                            e.currentTarget.style.borderColor = '#E4E4E7';
                                                            e.currentTarget.style.boxShadow = 'none';
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <div 
                                                            className="text-[11px] text-[#A1A1AA]"
                                                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                                        >
                                                            {buttonName}
                                                        </div>
                                                        {(isArmed || isPressed) && (
                                                            <div 
                                                                className="text-[9px] px-2.5 py-1 rounded-full font-bold tracking-wider"
                                                                style={{
                                                                    fontFamily: "'IBM Plex Mono', monospace",
                                                                    background: isArmed ? 'rgba(6, 182, 212, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                                    color: isArmed ? '#06B6D4' : '#10B981'
                                                                }}
                                                            >
                                                                {isArmed ? 'ARMED' : 'LIVE'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5 text-sm text-[#18181B]">
                                                            <span
                                                                className="text-[9px] font-bold tracking-wider"
                                                                style={{ 
                                                                    color: typeColor,
                                                                    fontFamily: "'IBM Plex Mono', monospace"
                                                                }}
                                                            >
                                                                {getTypeIcon(config.type)}
                                                            </span>
                                                            <span 
                                                                className="font-medium"
                                                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                                                            >
                                                                {config.label || config.input}
                                                            </span>
                                                        </div>
                                                        <div 
                                                            className="text-[10px] text-[#71717A] bg-[#F4F4F5] px-2.5 py-1 rounded-md"
                                                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                                        >
                                                            {typeof config.action === "string"
                                                                ? config.action
                                                                : config.action?.label || config.action?.input || "Mapped"}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Action Bar */}
            <div 
                className="p-6 pt-5"
                style={{ 
                    borderTop: '1px solid #E4E4E7',
                    background: '#FAFAFA'
                }}
            >
                <div className="flex gap-3">
                    {Object.keys(mappings).length > 0 && (
                        <button
                            onClick={onClearAll}
                            className="flex-1 py-3.5 bg-white border-2 border-[#FECACA] rounded-xl text-[#EF4444] text-sm font-semibold cursor-pointer transition-all duration-150 hover:bg-[#FEF2F2] hover:border-[#EF4444]"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                            Clear All
                        </button>
                    )}
                    <button
                        onClick={() => onSaveToDevice && onSaveToDevice(moduleId)}
                        className="flex-[2] py-3.5 bg-[#7C3AED] hover:bg-[#6D28D9] border-none rounded-xl text-white text-sm font-semibold cursor-pointer transition-all duration-150"
                        style={{ 
                            fontFamily: "'Space Grotesk', sans-serif",
                            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)'
                        }}
                    >
                        Save to Device
                    </button>
                </div>
            </div>
        </div>
    );
}
