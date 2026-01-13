import { useState } from "react";

export default function ButtonMappingModal({ button, onSave, onCancel, onClear }) {
    const [action, setAction] = useState(button.action || "");

    const handleSave = () => {
        onSave(button.name, action);
    };

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(6, 10, 14, 0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(2px)",
        }}
        onClick={onCancel} // Click outside to close
        >
            <div style={{
                background: "linear-gradient(180deg, rgba(18, 24, 32, 0.96) 0%, rgba(10, 14, 19, 0.92) 100%)",
                borderRadius: "14px",
                padding: "24px",
                width: "360px",
                maxWidth: "90%",
                border: "1px solid var(--oa-panel-border)",
                boxShadow: "var(--oa-shadow-soft)",
            }}
            onClick={(e) => e.stopPropagation()} // Prevent click through
            >
                <div style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "var(--oa-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "8px",
                }}>
                    Configure Input
                </div>
                
                <h2 style={{
                    margin: "0 0 20px 0",
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "var(--oa-text)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                }}>
                    {button.name}
                </h2>

                <div style={{ marginBottom: "20px" }}>
                    <label style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "13px",
                        color: "var(--oa-muted)",
                    }}>
                        Assign Action
                    </label>
                    <input
                        type="text"
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        placeholder="e.g., Jump"
                        autoFocus
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "10px",
                            fontSize: "14px",
                            color: "var(--oa-text)",
                            outline: "none",
                            transition: "border-color 0.15s ease",
                        }}
                        onFocus={(e) => e.target.style.borderColor = "var(--oa-accent)"}
                        onBlur={(e) => e.target.style.borderColor = "var(--oa-panel-border)"}
                        // Allow enter key to save
                        onKeyDown={(e) => { if(e.key === 'Enter') handleSave() }}
                    />
                </div>

                <div style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                }}>
                     <button
                        onClick={onCancel}
                        style={{
                            padding: "8px 16px",
                            background: "transparent",
                            color: "var(--oa-muted)",
                            border: "none",
                            fontSize: "13px",
                            cursor: "pointer",
                        }}
                        onMouseOver={(e) => e.target.style.color = "var(--oa-text)"}
                        onMouseOut={(e) => e.target.style.color = "var(--oa-muted)"}
                    >
                        Cancel
                    </button>
                    {button.action && (
                        <button
                            onClick={() => onClear(button.name)}
                            style={{
                                padding: "8px 12px",
                                background: "rgba(230, 118, 108, 0.12)",
                                color: "var(--oa-danger)",
                                border: "1px solid rgba(230, 118, 108, 0.35)",
                                borderRadius: "8px",
                                fontSize: "13px",
                                cursor: "pointer",
                            }}
                        >
                            Clear
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        style={{
                            padding: "8px 20px",
                            background: "var(--oa-accent)",
                            color: "#0b0d10",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: "500",
                            cursor: "pointer",
                        }}
                        onMouseOver={(e) => e.target.style.background = "var(--oa-accent-strong)"}
                        onMouseOut={(e) => e.target.style.background = "var(--oa-accent)"}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
