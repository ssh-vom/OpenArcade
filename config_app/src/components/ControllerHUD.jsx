export default function ControllerHUD({ controllerName, moduleCount, currentModule, modules, onModuleChange, isConnected }) {
    return (
        <>
        <div style={{
            width: "300px",
            height: "100%",
            background: "#121212",
            borderRight: "1px solid #2a2a2a",
            display: "flex",
            flexDirection: "column",
            zIndex: 10,
            flexShrink: 0,
            animation: "slideInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both",
        }}>
            {/* Header */}
            <div style={{
                padding: "20px",
                borderBottom: "1px solid #2a2a2a",
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
                        background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        color: "white",
                        fontWeight: "bold",
                    }}>
                        OA
                    </div>
                    <span style={{
                        color: "#fff",
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
                    fontSize: "12px",
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 8px",
                        background: isConnected ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        borderRadius: "4px",
                        border: `1px solid ${isConnected ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                        color: isConnected ? "#4ade80" : "#f87171",
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
                    color: "#525252",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "12px",
                }}>
                    Device
                </div>
                <div style={{
                    color: "#e5e5e5",
                    fontSize: "14px",
                    fontWeight: "500",
                    marginBottom: "4px",
                }}>
                    {controllerName}
                </div>
                <div style={{
                    color: "#737373",
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
                    color: "#525252",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "12px",
                }}>
                    Modules
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {modules.map((module, index) => (
                        <button
                            key={module.id}
                            onClick={() => onModuleChange(index)}
                            style={{
                                width: "100%",
                                textAlign: "left",
                                padding: "10px 12px",
                                background: currentModule === index ? "#262626" : "transparent",
                                border: "1px solid", // placeholder
                                borderColor: currentModule === index ? "#404040" : "transparent",
                                borderRadius: "6px",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                            onMouseOver={(e) => {
                                if (currentModule !== index) e.currentTarget.style.background = "#1a1a1a";
                            }}
                            onMouseOut={(e) => {
                                if (currentModule !== index) e.currentTarget.style.background = "transparent";
                            }}
                        >
                            <div>
                                <div style={{
                                    color: currentModule === index ? "#fff" : "#a3a3a3",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                    marginBottom: "2px",
                                }}>
                                    {module.name}
                                </div>
                                <div style={{
                                    color: "#525252",
                                    fontSize: "11px",
                                }}>
                                    {module.mappedButtons || 0} mapped
                                </div>
                            </div>
                            {currentModule === index && (
                                <div style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    background: "#3b82f6",
                                }} />
                            )}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Footer */}
            <div style={{
                padding: "16px 20px",
                borderTop: "1px solid #2a2a2a",
                fontSize: "11px",
                color: "#404040",
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