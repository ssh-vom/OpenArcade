export default function ButtonMappingsPanel({ mappings, moduleName, onSelectButton }) {
    return (
        <div className="w-[320px] h-full bg-white border-l border-gray-200 flex flex-col shrink-0 animate-slide-in-right">
            {/* Header */}
            <div className="p-5 border-b border-gray-100">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                    Inspector
                </div>
                <h3 className="m-0 text-base font-semibold text-gray-900">
                    {moduleName}
                </h3>
            </div>

            {/* List */}
            <div className="flex-1 p-5 overflow-y-auto panel-scroll">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-gray-500 font-medium">
                        Button Mappings
                    </span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                        {Object.keys(mappings).length} Active
                    </span>
                </div>

                {Object.keys(mappings).length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                        No buttons mapped.
                        <br />
                        <span className="text-xs text-gray-400 block mt-2 leading-relaxed">
                            Click a button in the 3D view
                            <br />to assign an action.
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {Object.entries(mappings).map(([buttonName, action]) => {
                            const display = typeof action === "string"
                                ? action
                                : action?.action || action?.label || action?.input || "Unmapped";
                            return (
                                <button
                                    key={buttonName}
                                    onClick={() => onSelectButton(buttonName, null)}
                                    className="w-full text-left p-3 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer transition-all duration-150 hover:border-[#0071E3]/30 hover:bg-[#0071E3]/[0.02] hover:shadow-sm"
                                >
                                    <div className="text-[11px] text-gray-400 mb-1 font-mono">
                                        {buttonName}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-900">
                                            {display}
                                        </span>
                                        <span className="text-[#0071E3] text-xs font-medium">
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
            <div className="p-4 border-t border-gray-100">
                <div className="text-[11px] text-gray-400 text-center py-2 px-3 rounded-xl bg-gray-50 border border-gray-100">
                    Bulk actions available in 2D view
                </div>
            </div>
        </div>
    );
}
