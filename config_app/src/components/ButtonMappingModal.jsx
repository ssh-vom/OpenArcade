import { useState } from "react";

// Using a more integrated dark theme look for the Modal
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
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(2px)",
        }}
        onClick={onCancel} // Click outside to close
        >
            <div style={{
                background: "#171717",
                borderRadius: "8px",
                padding: "24px",
                width: "360px",
                maxWidth: "90%",
                border: "1px solid #333",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)",
            }}
            onClick={(e) => e.stopPropagation()} // Prevent click through
            >
                <div style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#525252",
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
                    color: "#fff",
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
                        color: "#a3a3a3",
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
                            background: "#262626",
                            border: "1px solid #404040",
                            borderRadius: "6px",
                            fontSize: "14px",
                            color: "white",
                            outline: "none",
                            transition: "border-color 0.15s ease",
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                        onBlur={(e) => e.target.style.borderColor = "#404040"}
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
                            color: "#a3a3a3",
                            border: "none",
                            fontSize: "13px",
                            cursor: "pointer",
                        }}
                        onMouseOver={(e) => e.target.style.color = "#fff"}
                        onMouseOut={(e) => e.target.style.color = "#a3a3a3"}
                    >
                        Cancel
                    </button>
                    {button.action && (
                        <button
                            onClick={() => onClear(button.name)}
                            style={{
                                padding: "8px 12px",
                                background: "rgba(239, 68, 68, 0.1)",
                                color: "#f87171",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                borderRadius: "4px",
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
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "13px",
                            fontWeight: "500",
                            cursor: "pointer",
                        }}
                        onMouseOver={(e) => e.target.style.background = "#2563eb"}
                        onMouseOut={(e) => e.target.style.background = "#3b82f6"}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}