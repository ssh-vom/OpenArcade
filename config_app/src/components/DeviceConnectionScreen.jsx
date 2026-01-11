import { useState, useEffect } from "react";

export default function DeviceConnectionScreen({ onConnect }) {
    const [scanning, setScanning] = useState(true);
    const [deviceFound, setDeviceFound] = useState(false);

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
            background: "#0a0a0a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.5s ease-in",
        }}>
            <div style={{
                background: "#121212",
                borderRadius: "12px",
                padding: "48px",
                maxWidth: "500px",
                width: "90%",
                textAlign: "center",
                border: "1px solid #2a2a2a",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                animation: "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
            }}>
                {/* Logo */}
                <div style={{
                    width: "64px",
                    height: "64px",
                    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                    borderRadius: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    color: "white",
                    fontWeight: "bold",
                    marginBottom: "24px",
                }}>
                    OA
                </div>

                {/* Title */}
                <h1 style={{
                    margin: "0 0 12px 0",
                    fontSize: "24px",
                    fontWeight: "600",
                    color: "#ffffff",
                }}>
                    OpenArcade Configurator
                </h1>

                {/* Subtitle */}
                <p style={{
                    margin: "0 0 32px 0",
                    fontSize: "14px",
                    color: "#737373",
                    lineHeight: "1.6",
                }}>
                    Connect your OpenArcade controller to configure button mappings and module profiles.
                </p>

                {/* Device Status */}
                <div style={{
                    background: "#1a1a1a",
                    borderRadius: "8px",
                    padding: "20px",
                    marginBottom: "24px",
                    border: "1px solid #2a2a2a",
                }}>
                    {scanning ? (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "12px",
                            color: "#a3a3a3",
                            fontSize: "14px",
                        }}>
                            <div style={{
                                width: "16px",
                                height: "16px",
                                border: "2px solid #3b82f6",
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
                            color: "#4ade80",
                            fontSize: "14px",
                            animation: "fadeIn 0.3s ease-in",
                        }}>
                            <div style={{
                                width: "16px",
                                height: "16px",
                                background: "#4ade80",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "10px",
                                color: "#0a0a0a",
                                fontWeight: "bold",
                            }}>
                                ✓
                            </div>
                            <div style={{ textAlign: "left" }}>
                                <div style={{ fontWeight: "500" }}>Controller Found</div>
                                <div style={{ color: "#525252", fontSize: "12px" }}>OpenArcade Controller v1.0</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            color: "#f87171",
                            fontSize: "14px",
                        }}>
                            No device found
                        </div>
                    )}
                </div>

                {/* Connect Button */}
                <button
                    onClick={onConnect}
                    disabled={!deviceFound}
                    style={{
                        width: "100%",
                        padding: "14px 24px",
                        background: deviceFound
                            ? "#3b82f6"
                            : "#262626",
                        color: deviceFound
                            ? "#ffffff"
                            : "#525252",
                        border: deviceFound
                            ? "1px solid #3b82f6"
                            : "1px solid #2a2a2a",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: deviceFound ? "pointer" : "not-allowed",
                        transition: "all 0.2s ease",
                    }}
                    onMouseOver={(e) => {
                        if (deviceFound) e.target.style.background = "#2563eb";
                    }}
                    onMouseOut={(e) => {
                        if (deviceFound) e.target.style.background = "#3b82f6";
                    }}
                >
                    {deviceFound ? "Connect to Device" : "Waiting for Device..."}
                </button>

                {/* Help Text */}
                <p style={{
                    margin: "16px 0 0 0",
                    fontSize: "12px",
                    color: "#404040",
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
