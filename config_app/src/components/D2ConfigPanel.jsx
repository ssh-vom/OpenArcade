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
    editingMode = "keyboard",
    onEditingModeChange,
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
            case HID_INPUT_TYPES.GAMEPAD: return '#5180C1';
            case HID_INPUT_TYPES.KEYBOARD: return '#4A90A4';
            case HID_INPUT_TYPES.ANALOG: return '#6B9BD1';
            default: return '#707070';
        }
    };

    const getTypeBgClass = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return { bg: 'rgba(81, 128, 193, 0.12)', border: 'rgba(81, 128, 193, 0.25)', text: '#5180C1' };
            case HID_INPUT_TYPES.KEYBOARD: return { bg: 'rgba(74, 144, 164, 0.12)', border: 'rgba(74, 144, 164, 0.25)', text: '#4A90A4' };
            case HID_INPUT_TYPES.ANALOG: return { bg: 'rgba(107, 155, 209, 0.12)', border: 'rgba(107, 155, 209, 0.25)', text: '#6B9BD1' };
            default: return { bg: '#B8B8B8', border: '#A0A0A0', text: '#707070' };
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
            className="w-[320px] h-full bg-[#D9D9D9] flex flex-col shrink-0 animate-slide-in-right"
            style={{
                borderLeft: '1px solid #A0A0A0',
            }}
        >
            {/* Header Section */}
            <div className="p-6 pb-5">
                {/* Label + Title */}
                <div className="mb-5">
                    <div 
                        className="text-[10px] font-semibold text-[#707070] uppercase tracking-[0.12em] mb-1.5"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        Configuration
                    </div>
                    <h3 
                        className="m-0 text-xl font-semibold text-[#333333] tracking-tight"
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
            <div className="mx-6 h-px bg-[#B8B8B8]" />

            {/* Mapping Mode Section */}
            <div className="p-6">
                <div className="mb-5">
                    <div 
                        className="text-[10px] font-semibold text-[#707070] uppercase tracking-[0.12em] mb-2"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        Editing Bank
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { value: "keyboard", label: "KB" },
                            { value: "gamepad_pc", label: "PC" },
                            { value: "gamepad_switch_hori", label: "SW" },
                        ].map((option) => {
                            const active = editingMode === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => onEditingModeChange?.(option.value)}
                                    className="py-2.5 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-200 cursor-pointer"
                                    style={{
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        background: active ? 'rgba(81, 128, 193, 0.14)' : '#CCCCCC',
                                        borderColor: active ? '#5180C1' : '#A0A0A0',
                                        color: active ? '#5180C1' : '#555555',
                                    }}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <button
                    onClick={() => onToggleMappingMode && onToggleMappingMode()}
                    className={`w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide border-2 transition-all duration-200 cursor-pointer ${
                        isMappingMode
                            ? 'bg-[#5180C1] text-white border-[#5180C1]'
                            : 'bg-[#CCCCCC] text-[#333333] border-[#A0A0A0] hover:border-[#5180C1] hover:text-[#5180C1]'
                    }`}
                    style={{ 
                        fontFamily: "'Space Grotesk', sans-serif",
                        boxShadow: isMappingMode ? '0 4px 16px rgba(81, 128, 193, 0.3)' : 'none'
                    }}
                >
                    {isMappingMode ? 'Exit Mapping Mode' : 'Enter Mapping Mode'}
                </button>

                {/* Instructions card */}
                <div 
                    className="mt-5 rounded-xl px-5 py-4 text-sm leading-relaxed"
                    style={{
                        fontFamily: "'DM Sans', sans-serif",
                        background: '#CCCCCC',
                        border: '1px solid #B8B8B8',
                        color: '#333333'
                    }}
                >
                    {isMappingMode ? (
                        armedButton ? (
                            <>
                                Waiting for physical input for{' '}
                                <span 
                                    className="font-semibold px-2 py-1 rounded-md inline-block mt-1"
                                    style={{ 
                                        background: 'rgba(81, 128, 193, 0.15)',
                                        color: '#5180C1',
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
                                    : 'rgba(74, 144, 164, 0.08)',
                            border: `1px solid ${
                                mappingStatus.type === 'error'
                                    ? 'rgba(239, 68, 68, 0.2)'
                                    : mappingStatus.type === 'success'
                                        ? 'rgba(16, 185, 129, 0.2)'
                                        : 'rgba(74, 144, 164, 0.2)'
                            }`,
                            color: mappingStatus.type === 'error'
                                ? '#EF4444'
                                : mappingStatus.type === 'success'
                                    ? '#10B981'
                                    : '#4A90A4'
                        }}
                    >
                        {mappingStatus.message}
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="mx-6 h-px bg-[#B8B8B8]" />

            {/* Mappings List */}
            <div className="flex-1 p-6 overflow-y-auto panel-scroll">
                {Object.keys(mappings).length === 0 ? (
                    <div 
                        className="py-10 px-6 text-center rounded-2xl"
                        style={{
                            background: '#CCCCCC',
                            border: '2px dashed #A0A0A0'
                        }}
                    >
                        <div 
                            className="text-[10px] tracking-[0.15em] uppercase mb-2 font-semibold text-[#707070]"
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                            No Mappings
                        </div>
                        <div 
                            className="text-sm text-[#555555] leading-relaxed"
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
                                            className="text-[10px] text-[#707070] bg-[#B8B8B8] px-2.5 py-1 rounded-full font-medium ml-auto"
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
                                                            ? 'rgba(74, 144, 164, 0.08)'
                                                            : isPressed
                                                                ? 'rgba(16, 185, 129, 0.08)'
                                                                : '#CCCCCC',
                                                        border: isArmed
                                                            ? '2px solid rgba(74, 144, 164, 0.3)'
                                                            : isPressed
                                                                ? '2px solid rgba(16, 185, 129, 0.3)'
                                                                : '1px solid #A0A0A0',
                                                        boxShadow: (isArmed || isPressed)
                                                            ? `0 0 0 3px ${isArmed ? 'rgba(74, 144, 164, 0.1)' : 'rgba(16, 185, 129, 0.1)'}`
                                                            : 'none'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isArmed && !isPressed) {
                                                            e.currentTarget.style.background = '#D9D9D9';
                                                            e.currentTarget.style.borderColor = 'rgba(81, 128, 193, 0.3)';
                                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isArmed && !isPressed) {
                                                            e.currentTarget.style.background = '#CCCCCC';
                                                            e.currentTarget.style.borderColor = '#A0A0A0';
                                                            e.currentTarget.style.boxShadow = 'none';
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <div 
                                                            className="text-[11px] text-[#707070]"
                                                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                                        >
                                                            {buttonName}
                                                        </div>
                                                        {(isArmed || isPressed) && (
                                                            <div 
                                                                className="text-[9px] px-2.5 py-1 rounded-full font-bold tracking-wider"
                                                                style={{
                                                                    fontFamily: "'IBM Plex Mono', monospace",
                                                                    background: isArmed ? 'rgba(74, 144, 164, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                                    color: isArmed ? '#4A90A4' : '#10B981'
                                                                }}
                                                            >
                                                                {isArmed ? 'ARMED' : 'LIVE'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5 text-sm text-[#333333]">
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
                                                            className="text-[10px] text-[#555555] bg-[#B8B8B8] px-2.5 py-1 rounded-md"
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
                    borderTop: '1px solid #A0A0A0',
                    background: '#CCCCCC'
                }}
            >
                <div className="flex gap-3">
                    {Object.keys(mappings).length > 0 && (
                        <button
                            onClick={onClearAll}
                            className="flex-1 py-3.5 bg-[#D9D9D9] border-2 border-[#FECACA] rounded-xl text-[#EF4444] text-sm font-semibold cursor-pointer transition-all duration-150 hover:bg-[#FEF2F2] hover:border-[#EF4444]"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                            Clear All
                        </button>
                    )}
                    <button
                        onClick={() => onSaveToDevice && onSaveToDevice(moduleId)}
                        className="flex-[2] py-3.5 bg-[#5180C1] hover:bg-[#4070B0] border-none rounded-xl text-white text-sm font-semibold cursor-pointer transition-all duration-150"
                        style={{ 
                            fontFamily: "'Space Grotesk', sans-serif",
                            boxShadow: '0 4px 12px rgba(81, 128, 193, 0.25)'
                        }}
                    >
                        Save to Device
                    </button>
                </div>
            </div>
        </div>
    );
}
