import { HID_INPUT_TYPES } from "../services/HIDManager.js";

export default function D2ConfigPanel({ mappings, moduleName, onSelectButton, onClearAll, moduleId, onSaveToDevice, isConnected = true }) {
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

    const getTypeTone = (type) => {
        switch (type) {
            case HID_INPUT_TYPES.GAMEPAD:
                return { color: "#5b7cfa", border: "rgba(91, 124, 250, 0.3)" };
            case HID_INPUT_TYPES.KEYBOARD:
                return { color: "var(--oa-accent)", border: "rgba(95, 208, 196, 0.3)" };
            case HID_INPUT_TYPES.ANALOG:
                return { color: "var(--oa-warning)", border: "rgba(240, 192, 92, 0.3)" };
            default:
                return { color: "var(--oa-muted)", border: "rgba(142, 154, 168, 0.3)" };
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
            background: "linear-gradient(180deg, rgba(18, 24, 32, 0.96) 0%, rgba(10, 14, 19, 0.92) 100%)",
            borderLeft: "1px solid var(--oa-panel-border)",
            display: "flex",
            flexDirection: "column",
            zIndex: 10,
            flexShrink: 0,
            animation: "slideInRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both",
            backdropFilter: "blur(10px)",
            boxShadow: "var(--oa-shadow-soft)",
        }}>
            {/* Header */}
            <div style={{
                padding: "20px",
                borderBottom: "1px solid var(--oa-panel-border)",
                background: "transparent",
            }}>
                <div style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "var(--oa-muted)",
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
                    color: "var(--oa-text)",
                }}>
                    {moduleName}
                </h3>
            </div>

            {/* Device Status */}
            <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--oa-panel-border)",
                background: "rgba(255,255,255,0.02)",
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
                        background: isConnected ? "var(--oa-accent)" : "var(--oa-muted)",
                        animation: isConnected ? "pulse 2s infinite" : "none",
                    }} />
                    <span style={{ color: "var(--oa-muted)" }}>
                        {isConnected ? "Device Connected" : "Device Offline"}
                    </span>
                </div>
            </div>

            {/* Mappings List */}
            <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
                {Object.keys(mappings).length === 0 ? (
                    <div style={{
                        padding: "40px 0",
                        textAlign: "center",
                        color: "var(--oa-muted)",
                        fontSize: "13px",
                        border: "1px dashed var(--oa-panel-border)",
                        borderRadius: "8px",
                        background: "rgba(255,255,255,0.02)"
                    }}>
                        <div style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "12px" }}>
                            Awaiting Mapping
                        </div>
                        No buttons configured.
                        <br />
                        <span style={{ fontSize: "11px", color: "var(--oa-muted)", display: "block", marginTop: "8px" }}>
                            Click a button in the 2D view
                            <br />to configure HID input.
                        </span>
                    </div>
                ) : (
                    <div>
                        {/* Type Groups */}
                        {Object.entries(groupedMappings).map(([type, typeMappings]) => {
                            const tone = getTypeTone(type);
                            return (
                                <div key={type} style={{ marginBottom: "24px" }}>
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        marginBottom: "12px",
                                        fontSize: "12px",
                                        color: tone.color,
                                        fontWeight: "600",
                                    }}>
                                        <span style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width: "26px",
                                            height: "22px",
                                            borderRadius: "6px",
                                            background: "rgba(255,255,255,0.04)",
                                            border: `1px solid ${tone.border}`,
                                            fontSize: "10px",
                                            letterSpacing: "0.08em",
                                        }}>
                                            {getTypeIcon(type)}
                                        </span>
                                        <span>{getTypeLabel(type)}</span>
                                        <span style={{
                                            color: "var(--oa-muted)",
                                            background: "rgba(255,255,255,0.03)",
                                            padding: "2px 6px",
                                            borderRadius: "10px",
                                            border: "1px solid var(--oa-panel-border)",
                                            marginLeft: "auto"
                                        }}>
                                            {typeMappings.length}
                                        </span>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                        {typeMappings.map(({ buttonName, config }) => (
                                            <button
                                                key={buttonName}
                                                onClick={() => onSelectButton(buttonName, null)}
                                                style={{
                                                    width: "100%",
                                                    textAlign: "left",
                                                    padding: "10px",
                                                    background: "rgba(255,255,255,0.03)",
                                                    border: `1px solid ${tone.border}`,
                                                    borderRadius: "8px",
                                                    cursor: "pointer",
                                                    transition: "all 0.15s ease",
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.borderColor = tone.color;
                                                    e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.borderColor = tone.border;
                                                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                                                }}
                                            >
                                                <div style={{
                                                    fontSize: "10px",
                                                    color: "var(--oa-muted)",
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
                                                        color: "var(--oa-text)",
                                                    }}>
                                                        <span style={{
                                                            fontSize: "9px",
                                                            opacity: 0.8,
                                                            letterSpacing: "0.08em",
                                                            color: tone.color,
                                                        }}>
                                                            {getTypeIcon(config.type)}
                                                        </span>
                                                        <span>{config.label || config.input}</span>
                                                    </div>
                                                    <div style={{
                                                        fontSize: "10px",
                                                        color: "var(--oa-muted)",
                                                        background: "rgba(255,255,255,0.04)",
                                                        padding: "2px 6px",
                                                        borderRadius: "3px",
                                                    }}>
                                                        {typeof config.action === "string"
                                                            ? config.action
                                                            : config.action?.label || config.action?.input || "Mapped"}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {/* Action Bar */}
            <div style={{
                padding: "16px 20px",
                borderTop: "1px solid var(--oa-panel-border)",
                background: "transparent",
            }}>
                <div style={{ display: "flex", gap: "8px" }}>
                    {Object.keys(mappings).length > 0 && (
                        <button 
                            onClick={onClearAll}
                            style={{
                                flex: 1,
                                padding: "8px",
                                background: "rgba(230, 118, 108, 0.12)",
                                border: "1px solid rgba(230, 118, 108, 0.35)",
                                borderRadius: "8px",
                                color: "var(--oa-danger)",
                                fontSize: "12px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "all 0.2s",
                            }}
                            onMouseOver={(e) => e.target.style.background = "rgba(230, 118, 108, 0.2)"}
                            onMouseOut={(e) => e.target.style.background = "rgba(230, 118, 108, 0.12)"}
                        >
                            Clear All
                        </button>
                    )}
                    <button 
                        onClick={() => onSaveToDevice && onSaveToDevice(moduleId)}
                        style={{
                            flex: 2,
                            padding: "8px",
                            background: "rgba(95, 208, 196, 0.16)",
                            border: "1px solid rgba(95, 208, 196, 0.4)",
                            borderRadius: "8px",
                            color: "var(--oa-accent)",
                            fontSize: "12px",
                            fontWeight: "500",
                            cursor: "pointer",
                            transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => e.target.style.background = "rgba(95, 208, 196, 0.24)"}
                        onMouseOut={(e) => e.target.style.background = "rgba(95, 208, 196, 0.16)"}
                    >
                        Save to Device
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
