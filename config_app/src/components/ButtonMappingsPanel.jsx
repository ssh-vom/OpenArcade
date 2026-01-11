export default function ButtonMappingsPanel({ mappings, moduleName, onSelectButton }) {
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
                    Inspector
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

            {/* List */}
            <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                }}>
                    <span style={{
                        fontSize: "12px",
                        color: "#a3a3a3", 
                        fontWeight: "500"
                    }}>
                        Button Mappings
                    </span>
                    <span style={{
                        fontSize: "10px",
                        color: "#525252",
                        background: "#1a1a1a",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        border: "1px solid #2a2a2a"
                    }}>
                        {Object.keys(mappings).length} Active
                    </span>
                </div>

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
                        No buttons mapped.
                        <br />
                        <span style={{ fontSize: "11px", color: "#525252", display: "block", marginTop: "8px" }}>
                            Click a button in the 3D view
                            <br />to assign an action.
                        </span>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {Object.entries(mappings).map(([buttonName, action]) => (
                            <button
                                key={buttonName}
                                onClick={() => onSelectButton(buttonName, null)}
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "12px",
                                    background: "#1a1a1a",
                                    border: "1px solid #2a2a2a",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.borderColor = "#404040";
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.borderColor = "#2a2a2a";
                                }}
                            >
                                <div style={{
                                    fontSize: "11px",
                                    color: "#737373",
                                    marginBottom: "4px",
                                    fontFamily: "monospace",
                                }}>
                                    {buttonName}
                                </div>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}>
                                    <span style={{
                                        fontSize: "13px",
                                        fontWeight: "500",
                                        color: "#e5e5e5",
                                    }}>
                                        {action}
                                    </span>
                                    <span style={{
                                        color: "#404040",
                                        fontSize: "12px",
                                    }}>
                                        Edit
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Action Bar (Placeholder for global module actions) */}
            <div style={{
                padding: "16px 20px",
                borderTop: "1px solid #2a2a2a",
                background: "#171717",
            }}>
                <button style={{
                    width: "100%",
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
                    Clear All Mappings
                </button>
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
        `}</style>
        </>
    );
}