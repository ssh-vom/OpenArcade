export default function ButtonMappingsPanel({ mappings, moduleName, onSelectButton }) {
    return (
        <>
        <div
        className="oa-side-panel"
        style={{
            width: "300px",
            animation: "slideInRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both",
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
                    Inspector
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
                        color: "var(--oa-muted)",
                        fontWeight: "500"
                    }}>
                        Button Mappings
                    </span>
                    <span style={{
                        fontSize: "10px",
                        color: "var(--oa-muted)",
                        background: "rgba(255,255,255,0.03)",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        border: "1px solid var(--oa-panel-border)"
                    }}>
                        {Object.keys(mappings).length} Active
                    </span>
                </div>

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
                        No buttons mapped.
                        <br />
                        <span style={{ fontSize: "11px", color: "var(--oa-muted)", display: "block", marginTop: "8px" }}>
                            Click a button in the 3D view
                            <br />to assign an action.
                        </span>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {Object.entries(mappings).map(([buttonName, action]) => {
                            const display = typeof action === "string"
                                ? action
                                : action?.action || action?.label || action?.input || "Unmapped";
                            return (
                            <button
                                key={buttonName}
                                onClick={() => onSelectButton(buttonName, null)}
                                style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "12px",
                                    background: "rgba(255,255,255,0.03)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.borderColor = "rgba(215, 177, 90, 0.4)";
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                                }}
                            >
                                <div style={{
                                    fontSize: "11px",
                                    color: "var(--oa-muted)",
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
                                        color: "var(--oa-text)",
                                    }}>
                                        {display}
                                    </span>
                                    <span style={{
                                        color: "var(--oa-muted)",
                                        fontSize: "12px",
                                    }}>
                                        Edit
                                    </span>
                                </div>
                            </button>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {/* Action Bar (Placeholder for global module actions) */}
            <div style={{
                padding: "16px 20px",
                borderTop: "1px solid var(--oa-panel-border)",
                background: "transparent",
            }}>
                <div style={{
                    fontSize: "11px",
                    color: "var(--oa-muted)",
                    textAlign: "center",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                }}>
                    Bulk actions available in 2D view
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
        `}</style>
        </>
    );
}
