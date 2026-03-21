export default function ButtonMappingsPanel({ mappings, moduleName, onSelectButton }) {
    const getTypeColor = (type) => {
        switch (type) {
            case 'gamepad': return '#7C3AED';
            case 'keyboard': return '#06B6D4';
            case 'analog': return '#F97316';
            default: return '#A1A1AA';
        }
    };

    return (
        <div 
            className="w-[340px] h-full bg-white flex flex-col shrink-0 animate-slide-in-right"
            style={{
                borderLeft: '1px solid rgba(0, 0, 0, 0.06)',
                boxShadow: '-1px 0 3px rgba(0, 0, 0, 0.02)'
            }}
        >
            {/* Header */}
            <div className="p-5 pb-4">
                <div 
                    className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-[0.12em] mb-2"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                    Inspector
                </div>
                <h3 
                    className="m-0 text-lg font-semibold text-[#18181B] tracking-tight"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                    {moduleName}
                </h3>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[#E4E4E7] to-transparent" />

            {/* List */}
            <div className="flex-1 p-5 pt-4 overflow-y-auto panel-scroll">
                <div className="flex justify-between items-center mb-4">
                    <span 
                        className="text-xs text-[#52525B] font-medium"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                        Button Mappings
                    </span>
                    <span 
                        className="text-[10px] text-[#A1A1AA] bg-[#F4F4F5] px-2.5 py-1 rounded-full font-semibold"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        {Object.keys(mappings).length} Active
                    </span>
                </div>

                {Object.keys(mappings).length === 0 ? (
                    <div 
                        className="py-12 text-center rounded-2xl"
                        style={{
                            background: 'linear-gradient(135deg, #F9FAFB 0%, #F4F4F5 100%)',
                            border: '1px dashed #E4E4E7'
                        }}
                    >
                        <div 
                            className="text-[10px] tracking-[0.15em] uppercase mb-3 font-semibold text-[#A1A1AA]"
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                            No Mappings
                        </div>
                        <div 
                            className="text-sm text-[#52525B] leading-relaxed"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                            Click a button in the 3D view
                            <br />to assign an action.
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {Object.entries(mappings).map(([buttonName, action]) => {
                            const display = typeof action === "string"
                                ? action
                                : action?.action || action?.label || action?.input || "Unmapped";
                            const type = typeof action === "object" ? action?.type : null;
                            const typeColor = getTypeColor(type);
                            
                            return (
                                <button
                                    key={buttonName}
                                    onClick={() => onSelectButton(buttonName, null)}
                                    className="w-full text-left p-3.5 rounded-xl cursor-pointer transition-all duration-150 border-none"
                                    style={{
                                        background: '#F9FAFB',
                                        border: '1px solid #E4E4E7'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#FFFFFF';
                                        e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.25)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#F9FAFB';
                                        e.currentTarget.style.borderColor = '#E4E4E7';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div 
                                        className="text-[10px] text-[#A1A1AA] mb-1.5"
                                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                    >
                                        {buttonName}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span 
                                            className="text-sm font-medium text-[#18181B]"
                                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                                        >
                                            {display}
                                        </span>
                                        <span 
                                            className="text-[#7C3AED] text-xs font-semibold"
                                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                                        >
                                            Edit
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Action Bar */}
            <div 
                className="p-4"
                style={{ 
                    borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)'
                }}
            >
                <div 
                    className="text-[11px] text-[#A1A1AA] text-center py-3 px-4 rounded-xl"
                    style={{ 
                        fontFamily: "'DM Sans', sans-serif",
                        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.04) 0%, rgba(124, 58, 237, 0.01) 100%)',
                        border: '1px solid rgba(124, 58, 237, 0.1)'
                    }}
                >
                    Switch to 2D view for bulk actions
                </div>
            </div>
        </div>
    );
}
