export default function LiveInputPanel() {
    return (
        <div 
            className="flex-1 flex items-center justify-center p-8 relative overflow-hidden"
            style={{ background: '#D9D9D9' }}
        >
            {/* Subtle blueprint grid */}
            <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `
                        linear-gradient(rgba(81, 128, 193, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(81, 128, 193, 0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: '32px 32px'
                }}
            />

            <div className="text-center max-w-sm relative z-10">
                {/* Icon */}
                <div 
                    className="w-20 h-20 bg-gradient-to-br from-[#4A90A4] to-[#3A8094] rounded-2xl flex items-center justify-center mx-auto mb-8"
                    style={{ boxShadow: '0 4px 20px rgba(74, 144, 164, 0.25)' }}
                >
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                </div>

                <h2 
                    className="text-2xl font-semibold text-[#333333] mb-3 tracking-tight"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                    Live Input Visualization
                </h2>
                <p 
                    className="text-sm text-[#333333] leading-relaxed mb-10"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                    Monitor button presses, joystick movements, and input events
                    in real time as you interact with your controller.
                </p>

                {/* Feature preview cards */}
                <div className="flex flex-col gap-3 text-left mb-10">
                    {[
                        { title: "Real-Time Monitor", desc: "See inputs as they happen" },
                        { title: "Input History", desc: "Review recent input sequences" },
                        { title: "Latency Display", desc: "Measure input response times" },
                    ].map((feature, index) => (
                        <div 
                            key={feature.title} 
                            className="flex items-start gap-4 p-4 bg-[#CCCCCC] rounded-xl"
                            style={{
                                border: '1px solid #A0A0A0',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                                animationDelay: `${index * 100}ms`
                            }}
                        >
                            <div 
                                className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                                style={{ 
                                    background: '#4A90A4',
                                    boxShadow: '0 0 8px rgba(74, 144, 164, 0.4)'
                                }}
                            />
                            <div>
                                <div 
                                    className="text-sm font-semibold text-[#333333]"
                                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                >
                                    {feature.title}
                                </div>
                                <div 
                                    className="text-xs text-[#707070] mt-1"
                                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                                >
                                    {feature.desc}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div 
                    className="inline-flex items-center gap-2.5 text-xs text-[#333333] px-5 py-2.5 rounded-full"
                    style={{ 
                        fontFamily: "'IBM Plex Mono', monospace",
                        background: 'rgba(107, 155, 209, 0.12)',
                        border: '1px solid rgba(107, 155, 209, 0.25)'
                    }}
                >
                    <div 
                        className="w-2 h-2 rounded-full bg-[#6B9BD1]"
                        style={{ boxShadow: '0 0 6px rgba(107, 155, 209, 0.5)' }}
                    />
                    <span className="font-semibold text-[#6B9BD1]">Coming Soon</span>
                </div>
            </div>
        </div>
    );
}
