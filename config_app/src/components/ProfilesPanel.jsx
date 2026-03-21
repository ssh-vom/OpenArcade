// Use the new block logo from public folder
const oaBlockLogo = "/oa_block.png";

export default function ProfilesPanel() {
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
                    className="w-20 h-20 bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] rounded-2xl flex items-center justify-center mx-auto mb-8"
                    style={{ boxShadow: '0 4px 20px rgba(124, 58, 237, 0.2)' }}
                >
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                </div>

                <h2 
                    className="text-2xl font-semibold text-[#18181B] mb-3 tracking-tight"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                    Profiles & Presets
                </h2>
                <p 
                    className="text-sm text-[#52525B] leading-relaxed mb-10"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                    Create, save, and switch between configuration profiles.
                    Customize presets for different games and applications.
                </p>

                {/* Feature preview cards */}
                <div className="flex flex-col gap-3 text-left mb-10">
                    {[
                        { title: "Custom Profiles", desc: "Save and name unique configurations" },
                        { title: "Quick Switch", desc: "Instantly swap between profiles" },
                        { title: "Import / Export", desc: "Share profiles across devices" },
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
                                    background: '#7C3AED',
                                    boxShadow: '0 0 8px rgba(124, 58, 237, 0.3)'
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
