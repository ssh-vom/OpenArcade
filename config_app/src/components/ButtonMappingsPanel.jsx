export default function ButtonMappingsPanel({ mappings, moduleName, onSelectButton }) {
    const getTypeColor = (type) => {
        switch (type) {
            case 'gamepad': return '#5180C1';
            case 'keyboard': return '#4A90A4';
            case 'analog': return '#6B9BD1';
            default: return '#707070';
        }
    };

    return (
        <div 
            className="w-[340px] h-full bg-[#D9D9D9] flex flex-col shrink-0 animate-slide-in-right"
            style={{
                borderLeft: '1px solid #A0A0A0',
                boxShadow: '-1px 0 3px rgba(0, 0, 0, 0.04)'
            }}
        >
            {/* Header */}
            <div className="p-5 pb-4">
                <div 
                    className="text-[10px] font-semibold text-[#707070] uppercase tracking-[0.12em] mb-2"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                    Inspector
                </div>
                <h3 
                    className="m-0 text-lg font-semibold text-[#333333] tracking-tight"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                    {moduleName}
                </h3>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-gradient-to-r from-transparent via-[#A0A0A0] to-transparent" />

            {/* List */}
            <div className="flex-1 p-5 pt-4 overflow-y-auto panel-scroll">
                <div className="flex justify-between items-center mb-4">
                    <span 
                        className="text-xs text-[#333333] font-medium"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                        Button Mappings
                    </span>
                    <span 
                        className="text-[10px] text-[#707070] bg-[#CCCCCC] px-2.5 py-1 rounded-full font-semibold"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                        {Object.keys(mappings).length} Active
                    </span>
                </div>

                {Object.keys(mappings).length === 0 ? (
                    <div 
                        className="py-12 text-center rounded-2xl"
                        style={{
                            background: '#CCCCCC',
                            border: '1px dashed #A0A0A0'
                        }}
                    >
                        <div 
                            className="text-[10px] tracking-[0.15em] uppercase mb-3 font-semibold text-[#707070]"
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                            No Mappings
                        </div>
                        <div 
                            className="text-sm text-[#333333] leading-relaxed"
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
                                        background: '#CCCCCC',
                                        border: '1px solid #A0A0A0'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#D9D9D9';
                                        e.currentTarget.style.borderColor = 'rgba(81, 128, 193, 0.25)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#CCCCCC';
                                        e.currentTarget.style.borderColor = '#A0A0A0';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div 
                                        className="text-[10px] text-[#707070] mb-1.5"
                                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                                    >
                                        {buttonName}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span 
                                            className="text-sm font-medium text-[#333333]"
                                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                                        >
                                            {display}
                                        </span>
                                        <span 
                                            className="text-[#5180C1] text-xs font-semibold"
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
                    borderTop: '1px solid #A0A0A0',
                    background: '#CCCCCC'
                }}
            >
                <div 
                    className="text-[11px] text-[#707070] text-center py-3 px-4 rounded-xl"
                    style={{ 
                        fontFamily: "'DM Sans', sans-serif",
                        background: 'rgba(81, 128, 193, 0.08)',
                        border: '1px solid rgba(81, 128, 193, 0.15)'
                    }}
                >
                    Switch to 2D view for bulk actions
                </div>
            </div>
        </div>
    );
}
