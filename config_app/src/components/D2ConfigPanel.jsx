import { HID_INPUT_TYPES } from "../services/HIDManager.js";
import DeviceStorage from "../services/DeviceStorage.js";

export default function D2ConfigPanel({ mappings, moduleName, onSelectButton, onClearAll, moduleId, onSaveToDevice }) {
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
            case HID_INPUT_TYPES.GAMEPAD: return '🎮';
            case HID_INPUT_TYPES.KEYBOARD: return '⌨️';
            case HID_INPUT_TYPES.ANALOG: return '🕹️';
            default: return '❓';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD: return '#3b82f6';
            case HID_INPUT_TYPES.KEYBOARD: return '#10b981';
            case HID_INPUT_TYPES.ANALOG: return '#f59e0b';
            default: return '#6b7280';
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
        <>
        <div style={{
            width: "300px",
            height: "100%",
            background: "#121212",
            borderLeft: "1px solid #2a2a2a",
            display: "flex",
            flexDirection: "column",
            zIndex: 10,
            flexShrink: 0,
            animation: "slideInRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both",
        }}>
            {/* Header */}
            <div style={{
                padding: "20px",
                borderBottom: "1px solid #2a2a2a",
                background: "#121212",
            }}>
                <div style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#525252",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "8px",
                }}>
                    HID Configuration
                </div>
                <h3 style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#ffffff",
                }}>
                    {moduleName}
                </h3>
            </div>

            {/* Device Status */}
            <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid #2a2a2a",
                background: "#1a1a1a",
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12px",
                }}>
                    <div style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#10b981",
                        animation: "pulse 2s infinite",
                    }} />
                    <span style={{ color: "#a3a3a3" }}>Device Connected</span>
                </div>
            </div>

            {/* Mappings List */}
            <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
                {Object.keys(mappings).length === 0 ? (
                    <div style={{
                        padding: "40px 0",
                        textAlign: "center",
                        color: "#404040",
                        fontSize: "13px",
                        border: "1px dashed #2a2a2a",
                        borderRadius: "8px",
                        background: "rgba(255,255,255,0.01)"
                    }}>
                        <div style={{ fontSize: "24px", marginBottom: "12px" }}>🎮</div>
                        No buttons configured.
                        <br />
                        <span style={{ fontSize: "11px", color: "#525252", display: "block", marginTop: "8px" }}>
                            Click a button in the 2D view
                            <br />to configure HID input.
                        </span>
                    </div>
                ) : (
                    <div>
                        {/* Type Groups */}
                        {Object.entries(groupedMappings).map(([type, typeMappings]) => (
                            <div key={type} style={{ marginBottom: "24px" }}>
                                {/* Type Header */}
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    marginBottom: "12px",
                                    fontSize: "12px",
                                    color: getTypeColor(type),
                                    fontWeight: "600",
                                }}>
                                    <span>{getTypeIcon(type)}</span>
                                    <span>{getTypeLabel(type)}</span>
                                    <span style={{
                                        color: "#525252",
                                        background: "#1a1a1a",
                                        padding: "2px 6px",
                                        borderRadius: "10px",
                                        border: "1px solid #2a2a2a",
                                        marginLeft: "auto"
                                    }}>
                                        {typeMappings.length}
                                    </span>
                                </div>

                                {/* Mappings for this type */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    {typeMappings.map(({ buttonName, config }) => (
                                        <button
                                            key={buttonName}
                                            onClick={() => onSelectButton(buttonName, null)}
                                            style={{
                                                width: "100%",
                                                textAlign: "left",
                                                padding: "10px",
                                                background: "#1a1a1a",
                                                border: `1px solid ${getTypeColor(type)}20`,
                                                borderRadius: "6px",
                                                cursor: "pointer",
                                                transition: "all 0.15s ease",
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.borderColor = getTypeColor(type);
                                                e.currentTarget.style.background = "#262626";
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.borderColor = getTypeColor(type) + "20";
                                                e.currentTarget.style.background = "#1a1a1a";
                                            }}
                                        >
                                            <div style={{
                                                fontSize: "10px",
                                                color: "#737373",
                                                marginBottom: "3px",
                                                fontFamily: "monospace",
                                            }}>
                                                {buttonName}
                                            </div>
                                            <div style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                            }}>
                                                <div style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                    fontSize: "12px",
                                                    color: "#e5e5e5",
                                                }}>
                                                    <span style={{ fontSize: "10px", opacity: 0.7 }}>
                                                        {getTypeIcon(config.type)}
                                                    </span>
                                                    <span>{config.label || config.input}</span>
                                                </div>
                                                <div style={{
                                                    fontSize: "10px",
                                                    color: "#404040",
                                                    background: "#262626",
                                                    padding: "2px 6px",
                                                    borderRadius: "3px",
                                                }}>
                                                    {config.action}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Action Bar */}
            <div style={{
                padding: "16px 20px",
                borderTop: "1px solid #2a2a2a",
                background: "#171717",
            }}>
                <div style={{ display: "flex", gap: "8px" }}>
                    {Object.keys(mappings).length > 0 && (
                        <button 
                            onClick={onClearAll}
                            style={{
                                flex: 1,
                                padding: "8px",
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                borderRadius: "4px",
                                color: "#f87171",
                                fontSize: "12px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "all 0.2s",
                            }}
                            onMouseOver={(e) => e.target.style.background = "rgba(239, 68, 68, 0.15)"}
                            onMouseOut={(e) => e.target.style.background = "rgba(239, 68, 68, 0.1)"}
                        >
                            Clear All
                        </button>
                    )}
                    <button 
                        onClick={() => onSaveToDevice && onSaveToDevice(moduleId)}
                        style={{
                            flex: 2,
                            padding: "8px",
                            background: "rgba(59, 130, 246, 0.1)",
                            border: "1px solid rgba(59, 130, 246, 0.2)",
                            borderRadius: "4px",
                            color: "#3b82f6",
                            fontSize: "12px",
                            fontWeight: "500",
                            cursor: "pointer",
                            transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => e.target.style.background = "rgba(59, 130, 246, 0.15)"}
                        onMouseOut={(e) => e.target.style.background = "rgba(59, 130, 246, 0.1)"}
                    >
                        💾 Save to Device
                    </button>
                </div>
            </div>
        </div>
        <style>{`
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `}</style>
        </>
    );
}