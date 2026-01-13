import oaLogo from "../assets/oa-logo.svg";

export default function ControllerHUD({ controllerName, moduleCount, currentModule, modules, onModuleChange, isConnected }) {
    return (
        <>
        <div style={{
            width: "300px",
            height: "100%",
            background: "linear-gradient(180deg, rgba(18, 24, 32, 0.96) 0%, rgba(10, 14, 19, 0.92) 100%)",
            borderRight: "1px solid var(--oa-panel-border)",
            display: "flex",
            flexDirection: "column",
            zIndex: 10,
            flexShrink: 0,
            animation: "slideInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both",
            backdropFilter: "blur(10px)",
            boxShadow: "var(--oa-shadow-soft)",
        }}>
            {/* Header */}
            <div style={{
                padding: "20px",
                borderBottom: "1px solid var(--oa-panel-border)",
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "12px",
                }}>
                    <div style={{
                        width: "28px",
                        height: "28px",
                        background: "linear-gradient(135deg, rgba(95, 208, 196, 0.2), rgba(240, 192, 92, 0.2))",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(255,255,255,0.12)",
                        boxShadow: "0 6px 16px rgba(95, 208, 196, 0.2)",
                    }}>
                        <img
                            src={oaLogo}
                            alt="OpenArcade"
                            style={{
                                width: "18px",
                                height: "18px",
                                filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.35))",
                            }}
                        />
                    </div>
                    <span style={{
                        color: "var(--oa-text)",
                        fontWeight: "600",
                        fontSize: "15px",
                        letterSpacing: "-0.01em",
                    }}>
                        OpenArcade
                    </span>
                </div>

                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "11px",
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 8px",
                        background: isConnected ? "rgba(95, 208, 196, 0.12)" : "rgba(230, 118, 108, 0.12)",
                        borderRadius: "4px",
                        border: `1px solid ${isConnected ? "rgba(95, 208, 196, 0.35)" : "rgba(230, 118, 108, 0.35)"}`,
                        color: isConnected ? "var(--oa-accent)" : "var(--oa-danger)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                    }}>
                        <div style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "currentColor",
                        }} />
                        {isConnected ? "Online" : "Offline"}
                    </div>
                </div>
            </div>

            {/* Controller Info */}
            <div style={{ padding: "24px 20px 8px 20px" }}>
                <div style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "var(--oa-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "12px",
                }}>
                    Device
                </div>
                <div style={{
                    color: "var(--oa-text)",
                    fontSize: "14px",
                    fontWeight: "500",
                    marginBottom: "4px",
                }}>
                    {controllerName}
                </div>
                <div style={{
                    color: "var(--oa-muted)",
                    fontSize: "13px",
                }}>
                    {moduleCount} Connected Modules
                </div>
            </div>

            {/* Modules List */}
            <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
                <div style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "var(--oa-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "12px",
                }}>
                    Modules
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {modules.map((module, index) => {
                        const isModuleConnected = module.connected !== false;
                        return (
                        <button
                            key={module.id}
                            onClick={() => onModuleChange(index)}
                            style={{
                                width: "100%",
                                textAlign: "left",
                                padding: "10px 12px",
                                background: currentModule === index ? "rgba(95, 208, 196, 0.14)" : "rgba(255,255,255,0.02)",
                                border: "1px solid",
                                borderColor: currentModule === index ? "rgba(95, 208, 196, 0.35)" : "transparent",
                                borderRadius: "8px",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                opacity: isModuleConnected ? 1 : 0.5,
                            }}
                            onMouseOver={(e) => {
                                if (currentModule !== index) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                            }}
                            onMouseOut={(e) => {
                                if (currentModule !== index) e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                            }}
                        >
                            <div>
                                <div style={{
                                    color: currentModule === index ? "var(--oa-text)" : "var(--oa-muted)",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                    marginBottom: "2px",
                                }}>
                                    {module.name}
                                </div>
                                <div style={{
                                    color: "var(--oa-muted)",
                                    fontSize: "11px",
                                }}>
                                    {module.mappedButtons || 0} mapped
                                </div>
                                {module.deviceId && (
                                    <div style={{
                                        color: "var(--oa-muted)",
                                        fontSize: "10px",
                                        fontFamily: "monospace",
                                        marginTop: "2px",
                                    }}>
                                        {module.deviceId}
                                    </div>
                                )}
                                {!isModuleConnected && (
                                    <div style={{
                                        color: "var(--oa-muted)",
                                        fontSize: "10px",
                                        marginTop: "2px",
                                    }}>
                                        Offline
                                    </div>
                                )}
                            </div>
                            {currentModule === index && (
                                <div style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    background: "var(--oa-accent)",
                                }} />
                            )}
                        </button>
                        );
                    })}
                </div>
            </div>
            
            {/* Footer */}
            <div style={{
                padding: "16px 20px",
                borderTop: "1px solid var(--oa-panel-border)",
                fontSize: "11px",
                color: "var(--oa-muted)",
                display: "flex",
                justifyContent: "space-between",
            }}>
                <span>v0.1.0-alpha</span>
                <span>Configurator</span>
            </div>
        </div>
        <style>{`
            @keyframes slideInLeft {
                from {
                    opacity: 0;
                    transform: translateX(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `}</style>
        </>
    );
}
