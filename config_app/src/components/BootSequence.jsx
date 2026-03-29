import { useState, useEffect, useCallback } from "react";

const TOTAL_SCAN_ROWS = 20;
const SCAN_SPEED_MS = 60;

export default function BootSequence({ onBootComplete, error }) {
    const [phase, setPhase] = useState("boot");
    const [scanProgress, setScanProgress] = useState(0);
    const [memoryCheck, setMemoryCheck] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [hasWebSerial, setHasWebSerial] = useState(null);

    // Check WebSerial availability once
    useEffect(() => {
        setHasWebSerial("serial" in navigator);
    }, []);

    // Boot sequence: memory check -> logo reveal -> menu
    useEffect(() => {
        if (phase !== "boot") return;

        // Memory check phase
        let mem = 0;
        const memInterval = setInterval(() => {
            mem += Math.floor(Math.random() * 600) + 200;
            if (mem > 64000) mem = 64000;
            setMemoryCheck(mem);
        }, 30);

        // Start logo reveal after memory check
        const scanTimeout = setTimeout(() => {
            clearInterval(memInterval);
            
            let row = 0;
            const scanInterval = setInterval(() => {
                row++;
                setScanProgress(row);
                if (row >= TOTAL_SCAN_ROWS) {
                    clearInterval(scanInterval);
                    setTimeout(() => setPhase("menu"), 300);
                }
            }, SCAN_SPEED_MS);

            return () => clearInterval(scanInterval);
        }, 1200);

        return () => {
            clearInterval(memInterval);
            clearTimeout(scanTimeout);
        };
    }, [phase]);

    // Keyboard navigation
    useEffect(() => {
        if (phase !== "menu") return;
        
        const onKeyDown = (e) => {
            const options = hasWebSerial ? 2 : 1;
            if (e.key === "ArrowUp") {
                setSelectedIndex((i) => Math.max(0, i - 1));
            } else if (e.key === "ArrowDown") {
                setSelectedIndex((i) => Math.min(options - 1, i + 1));
            } else if (e.key === "Enter") {
                selectOption(selectedIndex);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, selectedIndex, hasWebSerial]);

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
        >
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
                    {/* Memory check */}
                    <div 
                        className="text-xs mb-8 tracking-[0.3em] uppercase"
                        style={{ color: "#707070", fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        System Check: {memoryCheck.toString().padStart(5, "0")}K
                    </div>

                    {/* Logo container with scan reveal */}
                    <div 
                        className="relative w-56 h-56 sm:w-72 sm:h-72 rounded-2xl flex items-center justify-center"
                        style={{ 
                            background: "#CCCCCC",
                            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
                        }}
                    >
                        {/* The logo with row-by-row reveal */}
                        <div className="relative w-full h-full flex items-center justify-center p-10">
                            {/* Dimmed base logo */}
                            <img 
                                src="/logos/oa_block.png" 
                                alt=""
                                className="w-full h-full object-contain"
                                style={{ opacity: 0.15, filter: "grayscale(100%)" }}
                            />

                            {/* Revealed rows */}
                            <div className="absolute inset-0 flex flex-col p-10">
                                {Array.from({ length: TOTAL_SCAN_ROWS }).map((_, i) => (
                                    <div 
                                        key={i}
                                        className="flex-1 w-full overflow-hidden relative"
                                        style={{
                                            opacity: i < scanProgress ? 1 : 0,
                                            transition: "opacity 0.08s ease-out"
                                        }}
                                    >
                                        <img 
                                            src="/logos/oa_block.png"
                                            alt=""
                                            className="absolute w-full object-contain"
                                            style={{
                                                height: `${TOTAL_SCAN_ROWS * 100}%`,
                                                top: `${-i * 100}%`,
                                                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))"
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Scan line cursor */}
                            <div 
                                className="absolute left-8 right-8 h-0.5 rounded-full"
                                style={{
                                    top: `${8 + (scanProgress / TOTAL_SCAN_ROWS) * 84}%`,
                                    background: "#5180C1",
                                    boxShadow: "0 0 8px 1px rgba(81, 128, 193, 0.5)",
                                    opacity: scanProgress < TOTAL_SCAN_ROWS ? 1 : 0,
                                    transition: "top 0.06s linear"
                                }}
                            />
                        </div>

                        {/* Corner accents */}
                        <div className="absolute top-3 left-3 w-3 h-3 border-l-2 border-t-2 border-[#5180C1]/40" />
                        <div className="absolute top-3 right-3 w-3 h-3 border-r-2 border-t-2 border-[#5180C1]/40" />
                        <div className="absolute bottom-3 left-3 w-3 h-3 border-l-2 border-b-2 border-[#5180C1]/40" />
                        <div className="absolute bottom-3 right-3 w-3 h-3 border-r-2 border-b-2 border-[#5180C1]/40" />
                    </div>

                    {/* Status text */}
                    <div 
                        className="mt-8 text-xs tracking-[0.2em]"
                        style={{ color: "#707070", fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        INITIALIZING...
                    </div>
                </div>
            )}

            {phase === "menu" && (
                <div 
                    className="flex flex-col items-center z-10 animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
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
