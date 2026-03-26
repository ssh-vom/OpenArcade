import { useState, useEffect } from "react";

const oaBlockLogo = "/logos/oa_block.png";

export default function DeviceConnectionScreen({ onConnect }) {
    const [scanning, setScanning] = useState(true);
    const [deviceFound, setDeviceFound] = useState(false);
    const [error, setError] = useState("");
    const [scanProgress, setScanProgress] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setScanning(false);
            setDeviceFound(true);
        }, 2000);

        // Animate scan progress
        const progressInterval = setInterval(() => {
            setScanProgress(prev => {
                if (prev >= 100) return 100;
                return prev + 5;
            });
        }, 100);

        return () => {
            clearTimeout(timer);
            clearInterval(progressInterval);
        };
    }, []);

    return (
        <div className="w-screen h-screen bg-[#D9D9D9] flex items-center justify-center animate-fade-in relative overflow-hidden">
            {/* Subtle blueprint grid background */}
            <div 
                className="absolute inset-0 opacity-60"
                style={{
                    background: `
                        linear-gradient(rgba(81, 128, 193, 0.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(81, 128, 193, 0.05) 1px, transparent 1px)
                    `,
                    backgroundSize: '32px 32px'
                }}
            />
            
            {/* Decorative gradient orbs */}
            <div 
                className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(81, 128, 193, 0.12) 0%, transparent 70%)' }}
            />
            <div 
                className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(107, 155, 209, 0.08) 0%, transparent 70%)' }}
            />

            <div 
                className="relative bg-[#CCCCCC] rounded-3xl p-12 max-w-[520px] w-[90%] text-center animate-slide-up"
                style={{
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 8px 32px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.04)'
                }}
            >
                {/* Logo with glow effect */}
                <div className="relative inline-flex items-center justify-center mb-8">
                    <div 
                        className="w-20 h-20 bg-gradient-to-br from-[#5180C1] to-[#4571B0] rounded-2xl flex items-center justify-center"
                        style={{
                            boxShadow: '0 4px 20px rgba(81, 128, 193, 0.3)'
                        }}
                    >
                        <img
                            src={oaBlockLogo}
                            alt="OpenArcade"
                            className="w-12 h-12 invert"
                        />
                    </div>
                    {/* Animated ring */}
                    {scanning && (
                        <div 
                            className="absolute inset-0 rounded-2xl border-2 border-[#5180C1] animate-ping"
                            style={{ animationDuration: '1.5s', opacity: 0.3 }}
                        />
                    )}
                </div>

                {/* Title */}
                <h1 
                    className="m-0 mb-3 text-[28px] font-semibold text-[#333333] tracking-tight"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                    OpenArcade
                </h1>

                {/* Subtitle */}
                <p 
                    className="m-0 mb-10 text-[15px] text-[#4A4A4A] leading-relaxed max-w-[360px] mx-auto"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                    Connect your controller to configure button mappings and module profiles.
                </p>

                {/* Device Status Card */}
                <div 
                    className="rounded-2xl p-5 mb-6 relative overflow-hidden transition-all duration-300"
                    style={{
                        background: deviceFound 
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.04) 100%)'
                            : 'linear-gradient(135deg, rgba(81, 128, 193, 0.08) 0%, rgba(81, 128, 193, 0.02) 100%)',
                        border: deviceFound 
                            ? '1px solid rgba(16, 185, 129, 0.25)'
                            : '1px solid rgba(81, 128, 193, 0.2)'
                    }}
                >
                    {scanning ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-3 text-[#4A4A4A] text-sm">
                                <div 
                                    className="w-5 h-5 border-2 border-[#5180C1] border-t-transparent rounded-full"
                                    style={{ animation: 'spin 0.8s linear infinite' }}
                                />
                                <span style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    Scanning for devices...
                                </span>
                            </div>
                            {/* Progress bar */}
                            <div className="h-1 bg-[#A0A0A0] rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-[#5180C1] to-[#7BA3D4] rounded-full transition-all duration-100"
                                    style={{ width: `${scanProgress}%` }}
                                />
                            </div>
                        </div>
                    ) : deviceFound ? (
                        <div className="flex items-center gap-4 animate-fade-in">
                            <div 
                                className="w-12 h-12 bg-[#10B981] rounded-xl flex items-center justify-center shrink-0"
                                style={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <div className="text-left flex-1">
                                <div 
                                    className="font-semibold text-[#333333] text-base"
                                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                >
                                    Controller Ready
                                </div>
                                <div 
                                    className="text-[#707070] text-xs mt-1 font-mono"
                                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                >
                                    OpenArcade v1.0 · USB Connected
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                                <span 
                                    className="text-[#10B981] text-xs font-semibold uppercase tracking-wider"
                                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                >
                                    Online
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-3 text-[#EF4444] text-sm py-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
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
                    className={`w-full py-4 px-6 rounded-xl text-[15px] font-semibold transition-all duration-200 cursor-pointer border-none
                        ${deviceFound
                            ? 'bg-[#5180C1] hover:bg-[#4571B0] text-white'
                            : 'bg-[#A0A0A0] text-[#707070] cursor-not-allowed'
                        }`}
                    style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        boxShadow: deviceFound 
                            ? '0 4px 14px rgba(81, 128, 193, 0.4)' 
                            : 'none',
                        transform: deviceFound ? 'translateY(0)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                        if (deviceFound) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(81, 128, 193, 0.45)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (deviceFound) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 14px rgba(81, 128, 193, 0.4)';
                        }
                    }}
                >
                    {deviceFound ? "Connect & Configure" : "Waiting for Device..."}
                </button>

                {error && (
                    <div 
                        className="mt-4 p-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#EF4444] text-sm"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                        {error}
                    </div>
                )}

                {/* Help Text */}
                <p 
                    className="mt-6 mb-0 text-xs text-[#707070] flex items-center justify-center gap-2"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                    </svg>
                    Ensure your controller is powered on and connected via USB
                </p>
            </div>

            {/* Version badge */}
            <div 
                className="absolute bottom-6 text-[11px] text-[#707070] tracking-wide"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
                OpenArcade Configurator v0.1.0
            </div>
        </div>
    );
}
