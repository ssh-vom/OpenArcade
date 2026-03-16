export default function LiveInputPanel() {
    return (
        <div className="flex-1 flex items-center justify-center p-8 bg-white">
            <div className="text-center max-w-sm">
                {/* Icon */}
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-100">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#86868b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                </div>

                <h2 className="text-xl font-semibold text-gray-900 mb-2 tracking-tight">
                    Live Input Visualization
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-8">
                    Monitor button presses, joystick movements, and input events
                    in real time as you interact with your controller.
                </p>

                {/* Feature preview cards */}
                <div className="flex flex-col gap-3 text-left mb-8">
                    {[
                        { title: "Real-Time Monitor", desc: "See inputs as they happen" },
                        { title: "Input History", desc: "Review recent input sequences" },
                        { title: "Latency Display", desc: "Measure input response times" },
                    ].map((feature) => (
                        <div key={feature.title} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="w-2 h-2 rounded-full bg-[#0071E3] mt-1.5 shrink-0" />
                            <div>
                                <div className="text-sm font-medium text-gray-900">{feature.title}</div>
                                <div className="text-xs text-gray-400 mt-0.5">{feature.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="inline-flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF9500]" />
                    Coming Soon
                </div>
            </div>
        </div>
    );
}
