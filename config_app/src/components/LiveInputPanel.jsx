export default function LiveInputPanel() {
    return (
        <div 
            className="flex-1 flex items-center justify-center p-8 relative overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #FAFAF8 0%, #F4F4F2 100%)' }}
        >
            {/* Subtle blueprint grid */}
            <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `
                        linear-gradient(rgba(124, 58, 237, 0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(124, 58, 237, 0.02) 1px, transparent 1px)
                    `,
                    backgroundSize: '32px 32px'
                }}
            />

            <div className="text-center max-w-sm relative z-10">
                {/* Icon */}
                <div 
                    className="w-20 h-20 bg-gradient-to-br from-[#06B6D4] to-[#0891B2] rounded-2xl flex items-center justify-center mx-auto mb-8"
                    style={{ boxShadow: '0 4px 20px rgba(6, 182, 212, 0.25)' }}
                >
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                </div>

                <h2 
                    className="text-2xl font-semibold text-[#18181B] mb-3 tracking-tight"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                    Live Input Visualization
                </h2>
                <p 
                    className="text-sm text-[#52525B] leading-relaxed mb-10"
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
                            className="flex items-start gap-4 p-4 bg-white rounded-xl"
                            style={{
                                border: '1px solid #E4E4E7',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                                animationDelay: `${index * 100}ms`
                            }}
                        >
                            <div 
                                className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                                style={{ 
                                    background: '#06B6D4',
                                    boxShadow: '0 0 8px rgba(6, 182, 212, 0.4)'
                                }}
                            />
                            <div>
                                <div 
                                    className="text-sm font-semibold text-[#18181B]"
                                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                >
                                    {feature.title}
                                </div>
                                <div 
                                    className="text-xs text-[#A1A1AA] mt-1"
                                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                                >
                                    {feature.desc}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div 
                    className="inline-flex items-center gap-2.5 text-xs text-[#52525B] px-5 py-2.5 rounded-full"
                    style={{ 
                        fontFamily: "'IBM Plex Mono', monospace",
                        background: 'rgba(249, 115, 22, 0.08)',
                        border: '1px solid rgba(249, 115, 22, 0.2)'
                    }}
                >
                    <div 
                        className="w-2 h-2 rounded-full bg-[#F97316]"
                        style={{ boxShadow: '0 0 6px rgba(249, 115, 22, 0.5)' }}
                    />
                    <span className="font-semibold text-[#F97316]">Coming Soon</span>
                </div>
            </div>
        </div>
    );
}
