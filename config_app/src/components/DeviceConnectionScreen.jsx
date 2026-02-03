import { useState, useEffect } from "react";
import oaLogo from "../assets/oa-logo.svg";

export default function DeviceConnectionScreen({ onConnect }) {
    const [scanning, setScanning] = useState(true);
    const [deviceFound, setDeviceFound] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setScanning(false);
            setDeviceFound(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div style={{
            width: "100vw",
            height: "100vh",
            background: "radial-gradient(900px circle at 15% 0%, rgba(215, 177, 90, 0.16), transparent 60%), radial-gradient(700px circle at 85% 10%, rgba(240, 204, 122, 0.1), transparent 55%), var(--oa-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.5s ease-in",
        }}>
            <div
            className="oa-panel-surface"
            style={{
                borderRadius: "18px",
                padding: "52px",
                maxWidth: "500px",
                width: "90%",
                textAlign: "center",
                animation: "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
                backdropFilter: "blur(12px)",
            }}>
                {/* Logo */}
                <div style={{
                    width: "64px",
                    height: "64px",
                    background: "linear-gradient(135deg, rgba(215, 177, 90, 0.2), rgba(240, 204, 122, 0.2))",
                    borderRadius: "14px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "24px",
                    boxShadow: "0 12px 28px rgba(215, 177, 90, 0.22)",
                    border: "1px solid rgba(255,255,255,0.12)",
                }}>
                    <img
                        src={oaLogo}
                        alt="OpenArcade"
                        style={{
                            width: "34px",
                            height: "34px",
                            filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.35))",
                        }}
                    />
                </div>

                {/* Title */}
                <h1 style={{
                    margin: "0 0 12px 0",
                    fontSize: "24px",
                    fontWeight: "600",
                    color: "var(--oa-text)",
                }}>
                    OpenArcade Configurator
                </h1>

                {/* Subtitle */}
                <p style={{
                    margin: "0 0 32px 0",
                    fontSize: "14px",
                    color: "var(--oa-muted)",
                    lineHeight: "1.6",
                }}>
                    Connect your OpenArcade controller to configure button mappings and module profiles.
                </p>

                {/* Device Status */}
                <div style={{
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: "10px",
                    padding: "20px",
                    marginBottom: "24px",
                    border: "1px solid var(--oa-panel-border)",
                }}>
                    {scanning ? (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "12px",
                            color: "var(--oa-muted)",
                            fontSize: "14px",
                        }}>
                            <div style={{
                                width: "16px",
                                height: "16px",
                                border: "2px solid var(--oa-accent)",
                                borderTopColor: "transparent",
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite",
                            }} />
                            Scanning for devices...
                        </div>
                    ) : deviceFound ? (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            color: "var(--oa-accent)",
                            fontSize: "14px",
                            animation: "fadeIn 0.3s ease-in",
                        }}>
                            <div style={{
                                width: "16px",
                                height: "16px",
                                background: "var(--oa-accent)",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "10px",
                                color: "#0b0d10",
                                fontWeight: "bold",
                            }}>
                                ✓
                            </div>
                            <div style={{ textAlign: "left" }}>
                                <div style={{ fontWeight: "500" }}>Controller Found</div>
                                <div style={{ color: "var(--oa-muted)", fontSize: "12px" }}>OpenArcade Controller v1.0</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            color: "var(--oa-danger)",
                            fontSize: "14px",
                        }}>
                            No device found
                        </div>
                    )}
                </div>

                {/* Connect Button */}
                <button
                    onClick={async () => {
                        try {
                            setError("");
                            await onConnect();
                        } catch (err) {
                            setError(err?.message || "Failed to connect");
                        }
                    }}
                    disabled={!deviceFound}
                    style={{
                        width: "100%",
                        padding: "14px 24px",
                        background: deviceFound
                            ? "var(--oa-accent)"
                            : "rgba(255,255,255,0.04)",
                        color: deviceFound
                            ? "#0b0d10"
                            : "var(--oa-muted)",
                        border: deviceFound
                            ? "1px solid rgba(215, 177, 90, 0.4)"
                            : "1px solid var(--oa-panel-border)",
                        borderRadius: "12px",
                        fontSize: "14px",
                        fontWeight: "600",
                        letterSpacing: "0.02em",
                        textTransform: "uppercase",
                        cursor: deviceFound ? "pointer" : "not-allowed",
                        transition: "all 0.2s ease",
                    }}
                    onMouseOver={(e) => {
                        if (deviceFound) e.target.style.background = "var(--oa-accent-strong)";
                    }}
                    onMouseOut={(e) => {
                        if (deviceFound) e.target.style.background = "var(--oa-accent)";
                    }}
                >
                    {deviceFound ? "Connect to Device" : "Waiting for Device..."}
                </button>

                {error && (
                    <div style={{
                        marginTop: "12px",
                        color: "var(--oa-danger)",
                        fontSize: "12px",
                    }}>
                        {error}
                    </div>
                )}

                {/* Help Text */}
                <p style={{
                    margin: "16px 0 0 0",
                    fontSize: "12px",
                    color: "var(--oa-muted)",
                }}>
                    Make sure your controller is powered on and connected via USB
                </p>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
