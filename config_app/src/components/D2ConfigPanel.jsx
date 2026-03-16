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
            default: return 'NA';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return '#5856D6';
            case HID_INPUT_TYPES.KEYBOARD: return '#007AFF';
            case HID_INPUT_TYPES.ANALOG: return '#FF9500';
            default: return '#8E8E93';
        }
    };

    const getTypeBgClass = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return 'bg-purple-50 border-purple-200 text-purple-600';
            case HID_INPUT_TYPES.KEYBOARD: return 'bg-blue-50 border-blue-200 text-blue-600';
            case HID_INPUT_TYPES.ANALOG: return 'bg-orange-50 border-orange-200 text-orange-600';
            default: return 'bg-gray-50 border-gray-200 text-gray-500';
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
        <div className="w-[320px] h-full bg-white border-l border-gray-200 flex flex-col shrink-0 animate-slide-in-right">
            {/* Header */}
            <div className="p-5 border-b border-gray-100">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                    HID Configuration
                </div>
                <h3 className="m-0 text-base font-semibold text-gray-900">
                    {moduleName}
                </h3>
            </div>

            {/* Device Status */}
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2 text-xs">
                    <div
                        className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`}
                        style={isConnected ? { animation: 'pulse-dot 2s infinite' } : undefined}
                    />
                    <span className="text-gray-500">
                        {isConnected ? "Device Connected" : "Device Offline"}
                    </span>
                </div>
            </div>

            <div className="px-5 py-4 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2 mb-3">
                    <button
                        onClick={() => onToggleMappingMode && onToggleMappingMode()}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold tracking-wide border transition-colors ${
                            isMappingMode
                                ? 'bg-[#0071E3] text-white border-[#0071E3]'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        {isMappingMode ? 'Exit Mapping Mode' : 'Enter Mapping Mode'}
                    </button>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 px-3.5 py-3 text-xs leading-relaxed text-gray-500">
                    {isMappingMode ? (
                        armedButton ? (
                            <>
                                Waiting for a physical button press for <span className="font-semibold text-[#0071E3]">{armedButton}</span>.
                            </>
                        ) : (
                            "Select a UI button, then press the physical button you want to bind to it."
                        )
                    ) : (
                        "Enable Mapping Mode to rebind which physical control each UI button represents."
                    )}
                </div>

                {mappingStatus && (
                    <div className={`mt-3 rounded-xl px-3 py-2 text-[11px] font-medium ${
                        mappingStatus.type === 'error'
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : mappingStatus.type === 'success'
                                ? 'bg-green-50 text-green-600 border border-green-100'
                                : 'bg-blue-50 text-[#0071E3] border border-blue-100'
                    }`}>
                        {mappingStatus.message}
                    </div>
                )}
            </div>

            {/* Mappings List */}
            <div className="flex-1 p-5 overflow-y-auto panel-scroll">
                {Object.keys(mappings).length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                        <div className="text-[10px] tracking-widest uppercase mb-3 font-semibold text-gray-300">
                            Awaiting Mapping
                        </div>
                        No buttons configured.
                        <br />
                        <span className="text-xs text-gray-400 block mt-2 leading-relaxed">
                            Click a button in the 2D view
                            <br />to configure HID input.
                        </span>
                    </div>
                ) : (
                    <div>
                        {/* Type Groups */}
                        {Object.entries(groupedMappings).map(([type, typeMappings]) => {
                            const typeColor = getTypeColor(type);
                            return (
                                <div key={type} className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span
                                            className={`inline-flex items-center justify-center w-7 h-5.5 rounded-md border text-[10px] font-semibold tracking-wider ${getTypeBgClass(type)}`}
                                        >
                                            {getTypeIcon(type)}
                                        </span>
                                        <span className="text-xs font-semibold" style={{ color: typeColor }}>
                                            {getTypeLabel(type)}
                                        </span>
                                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium ml-auto">
                                            {typeMappings.length}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        {typeMappings.map(({ buttonName, config }) => {
                                            const isArmed = armedButton === buttonName;
                                            const isPressed = pressedButtonSet.has(buttonName);

                                            return (
                                                <button
                                                    key={buttonName}
                                                    onClick={() => onSelectButton(buttonName, null)}
                                                    className={`w-full text-left p-3 border rounded-xl cursor-pointer transition-all duration-150 ${
                                                        isArmed
                                                            ? 'bg-blue-50 border-blue-200 shadow-sm'
                                                            : isPressed
                                                                ? 'bg-green-50 border-green-200 shadow-sm'
                                                                : 'bg-gray-50 border-gray-100 hover:border-gray-300 hover:bg-white hover:shadow-sm'
                                                    }`}
                                                >
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <div className="text-[10px] text-gray-400 font-mono">
                                                        {buttonName}
                                                    </div>
                                                    {(isArmed || isPressed) && (
                                                        <div className={`text-[9px] px-2 py-0.5 rounded-full font-semibold tracking-wider ${
                                                            isArmed
                                                                ? 'bg-blue-100 text-[#0071E3]'
                                                                : 'bg-green-100 text-green-600'
                                                        }`}>
                                                            {isArmed ? 'ARMED' : 'LIVE'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-900">
                                                        <span
                                                            className="text-[9px] font-semibold tracking-wider"
                                                            style={{ color: typeColor }}
                                                        >
                                                            {getTypeIcon(config.type)}
                                                        </span>
                                                        <span className="font-medium">{config.label || config.input}</span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
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
            <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                    {Object.keys(mappings).length > 0 && (
                        <button
                            onClick={onClearAll}
                            className="flex-1 py-2 bg-red-50 border border-red-200 rounded-xl text-red-500 text-xs font-medium cursor-pointer transition-colors hover:bg-red-100"
                        >
                            Clear All
                        </button>
                    )}
                    <button
                        onClick={() => onSaveToDevice && onSaveToDevice(moduleId)}
                        className="flex-[2] py-2 bg-[#0071E3] hover:bg-[#0077ED] border-none rounded-xl text-white text-xs font-medium cursor-pointer transition-colors"
                    >
                        Save to Device
                    </button>
                </div>
            </div>
        </div>
    );
}
