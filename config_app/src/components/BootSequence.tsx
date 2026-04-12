import { useState, useCallback } from "react";
import { useMountEffect } from "../hooks/useMountEffect";

const TOTAL_SCAN_ROWS = 20;
const SCAN_SPEED_MS = 55;
const START_DELAY_MS = 300;

// CSS animation for the boot scan - no JavaScript timers needed
const bootAnimationStyles = `
@keyframes scan-row-reveal {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
}

@keyframes scan-line-move {
    0% { top: 4%; opacity: 0.9; }
    100% { top: 96%; opacity: 0; }
}

@keyframes glow-pulse {
    0%, 100% { opacity: 0.12; }
    50% { opacity: 0.2; }
}

.scan-row {
    opacity: 0;
    animation: scan-row-reveal 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.scan-line {
    animation: scan-line-move ${TOTAL_SCAN_ROWS * SCAN_SPEED_MS}ms linear ${START_DELAY_MS}ms forwards;
}

.glow-orb {
    animation: glow-pulse 2s ease-in-out infinite;
}

.menu-enter {
    animation: fade-in-up 0.5s ease-out forwards;
}

@keyframes fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
`;

export default function BootSequence({ onBootComplete, error }) {
    const [phase, setPhase] = useState("boot");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [hasWebSerial, setHasWebSerial] = useState(false);

    // Check WebSerial availability once on mount - legitimate external sync
    useMountEffect(() => {
        setHasWebSerial("serial" in navigator);
    });

    // Handle boot completion via CSS animation end
    const handleScanComplete = useCallback(() => {
        setPhase("menu");
    }, []);

    // Keyboard navigation - handled declaratively with useCallback, not effect
    const handleKeyDown = useCallback((e) => {
        if (phase !== "menu") return;
        
        const options = hasWebSerial ? 2 : 1;
        if (e.key === "ArrowUp") {
            setSelectedIndex((i) => Math.max(0, i - 1));
        } else if (e.key === "ArrowDown") {
            setSelectedIndex((i) => Math.min(options - 1, i + 1));
        } else if (e.key === "Enter") {
            selectOption(selectedIndex);
        }
    }, [phase, hasWebSerial, selectedIndex]);

    // Attach keyboard listener at component level - not in effect
    // Using React's onKeyDown on a focusable container would be better,
    // but for global window events, we use the hook pattern
    useMountEffect(() => {
        const listener = (e) => handleKeyDown(e);
        window.addEventListener("keydown", listener);
        return () => window.removeEventListener("keydown", listener);
    });

    const selectOption = useCallback((index) => {
        if (!hasWebSerial && index === 0) {
            onBootComplete({ type: "demo" });
            return;
        }
        
        if (index === 0) {
            onBootComplete({ type: "serial" });
        } else if (index === 1) {
            onBootComplete({ type: "demo" });
        }
    }, [hasWebSerial, onBootComplete]);

    const menuOptions = hasWebSerial
        ? [
            { label: "Connect USB Device", sub: "Select your OpenArcade controller" },
            { label: "Demo Mode", sub: "Try without hardware" },
        ]
        : [
            { label: "Demo Mode", sub: "WebSerial not available - use Chrome/Edge" },
        ];

    return (
        <div 
            className="w-screen h-screen flex flex-col items-center justify-center overflow-hidden relative"
            style={{ 
                fontFamily: "'Space Grotesk', 'IBM Plex Mono', sans-serif",
                background: "linear-gradient(180deg, #D9D9D9 0%, #CCCCCC 100%)"
            }}
            tabIndex={0}
        >
            {/* Inject animation styles */}
            <style>{bootAnimationStyles}</style>
            
            {/* Subtle grid background */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(81, 128, 193, 0.08) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(81, 128, 193, 0.08) 1px, transparent 1px)
                    `,
                    backgroundSize: "32px 32px"
                }}
            />

            {phase === "boot" && (
                <div className="flex flex-col items-center z-10">
                    {/* Logo container with CSS-driven scan reveal */}
                    <div 
                        className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-2xl flex items-center justify-center"
                        style={{ 
                            background: "#CCCCCC",
                            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
                        }}
                    >
                        {/* The logo with CSS row-by-row reveal */}
                        <div className="relative w-full h-full flex items-center justify-center p-8">
                            {/* Dimmed base logo */}
                            <img 
                                src="/logos/oa_block.png" 
                                alt=""
                                className="w-full h-full object-contain"
                                style={{ opacity: 0.1, filter: "grayscale(100%)" }}
                            />

                            {/* Revealed rows with CSS cascade */}
                            <div className="absolute inset-0 flex flex-col p-8">
                                {Array.from({ length: TOTAL_SCAN_ROWS }).map((_, i) => (
                                    <div 
                                        key={i}
                                        className="flex-1 w-full overflow-hidden relative scan-row"
                                        style={{
                                            animationDelay: `${START_DELAY_MS + i * SCAN_SPEED_MS}ms`
                                        }}
                                    >
                                        <img 
                                            src="/logos/oa_block.png"
                                            alt=""
                                            className="absolute w-full object-contain"
                                            style={{
                                                height: `${TOTAL_SCAN_ROWS * 100}%`,
                                                top: `${-i * 100}%`,
                                                filter: "drop-shadow(0 2px 6px rgba(0, 0, 0, 0.12))"
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* CSS-driven glow scan line with trail */}
                            <div 
                                className="absolute left-4 right-4 h-2 rounded-full pointer-events-none scan-line"
                                style={{
                                    background: "linear-gradient(180deg, rgba(81, 128, 193, 0.8), rgba(81, 128, 193, 0.2))",
                                    boxShadow: "0 0 30px 4px rgba(81, 128, 193, 0.5), 0 -10px 40px 6px rgba(81, 128, 193, 0.2)",
                                }}
                                onAnimationEnd={handleScanComplete}
                            />
                        </div>

                        {/* Corner accents */}
                        <div className="absolute top-3 left-3 w-3 h-3 border-l-2 border-t-2 border-[#5180C1]/40" />
                        <div className="absolute top-3 right-3 w-3 h-3 border-r-2 border-t-2 border-[#5180C1]/40" />
                        <div className="absolute bottom-3 left-3 w-3 h-3 border-l-2 border-b-2 border-[#5180C1]/40" />
                        <div className="absolute bottom-3 right-3 w-3 h-3 border-r-2 border-b-2 border-[#5180C1]/40" />
                    </div>
                </div>
            )}

            {phase === "menu" && (
                <div className="flex flex-col items-center z-10 menu-enter">
                    {/* Logo header */}
                    <div className="w-20 h-20 mb-6 opacity-90">
                        <img 
                            src="/logos/oa_block.png" 
                            alt="OpenArcade"
                            className="w-full h-full object-contain"
                        />
                    </div>

                    {/* Title */}
                    <div 
                        className="text-2xl font-semibold mb-1 tracking-tight"
                        style={{ 
                            color: "#333333",
                            fontFamily: "'Space Grotesk', sans-serif"
                        }}
                    >
                        OpenArcade
                    </div>
                    <div 
                        className="text-xs mb-10 tracking-[0.15em]"
                        style={{ color: "#707070", fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        CONFIGURATION SYSTEM v0.1
                    </div>

                    {/* Error display */}
                    {error && (
                        <div 
                            className="mb-6 px-5 py-3 rounded-xl text-sm max-w-sm text-center"
                            style={{
                                background: "rgba(239, 68, 68, 0.08)",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                color: "#EF4444"
                            }}
                        >
                            <div className="font-semibold mb-1">Connection Failed</div>
                            <div style={{ color: "rgba(239, 68, 68, 0.8)" }}>{error}</div>
                        </div>
                    )}

                    {/* Menu options */}
                    <div className="space-y-2">
                        {menuOptions.map((opt, idx) => (
                            <button
                                key={idx}
                                onClick={() => selectOption(idx)}
                                onMouseEnter={() => setSelectedIndex(idx)}
                                className="block w-full text-left px-5 py-4 min-w-[300px] rounded-xl transition-all duration-150"
                                style={{
                                    background: selectedIndex === idx ? "#5180C1" : "#CCCCCC",
                                    border: "1px solid " + (selectedIndex === idx ? "#5180C1" : "#A0A0A0"),
                                    boxShadow: selectedIndex === idx 
                                        ? "0 4px 16px rgba(81, 128, 193, 0.3)" 
                                        : "0 1px 3px rgba(0, 0, 0, 0.05)"
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <span style={{ 
                                        color: selectedIndex === idx ? "#ffffff" : "#707070",
                                        fontSize: "14px"
                                    }}>
                                        {selectedIndex === idx ? "›" : " "}
                                    </span>
                                    <div>
                                        <div style={{ 
                                            color: selectedIndex === idx ? "#ffffff" : "#333333",
                                            fontSize: "14px",
                                            fontWeight: 500
                                        }}>
                                            {opt.label}
                                        </div>
                                        <div style={{ 
                                            color: selectedIndex === idx ? "rgba(255,255,255,0.7)" : "#707070",
                                            fontSize: "11px",
                                            marginTop: "2px"
                                        }}>
                                            {opt.sub}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Footer hint */}
                    <div 
                        className="mt-10 text-xs flex gap-6"
                        style={{ color: "#707070", fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        <span>[↑↓] Navigate</span>
                        <span>[Enter] Select</span>
                    </div>
                </div>
            )}
        </div>
    );
}
