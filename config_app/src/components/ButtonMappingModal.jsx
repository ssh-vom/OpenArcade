import { useState } from "react";

export default function ButtonMappingModal({ button, onSave, onCancel, onClear }) {
    const [action, setAction] = useState(button.action || "");

    const handleSave = () => {
        onSave(button.name, action);
    };

    return (
        <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-2xl p-7 w-[420px] max-w-[90%] animate-scale-in"
                style={{
                    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.03)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div 
                    className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-[0.12em] mb-2"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                    Configure Input
                </div>

                <h2 
                    className="m-0 mb-6 text-xl font-semibold text-[#18181B] tracking-tight flex items-center gap-2"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                    {button.name}
                </h2>

                <div className="mb-6">
                    <label 
                        className="block mb-2.5 text-sm text-[#52525B] font-medium"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                        Assign Action
                    </label>
                    <input
                        type="text"
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        placeholder="e.g., Jump"
                        autoFocus
                        className="w-full px-4 py-3 bg-[#F4F4F5] hover:bg-white border border-[#E4E4E7] rounded-xl text-sm text-[#18181B] outline-none transition-all duration-150 focus:border-[#7C3AED] focus:bg-white"
                        style={{ 
                            fontFamily: "'DM Sans', sans-serif"
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                        onKeyDown={(e) => { if(e.key === 'Enter') handleSave() }}
                    />
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 bg-transparent text-[#52525B] border-none text-sm font-medium cursor-pointer hover:text-[#18181B] transition-colors"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                        Cancel
                    </button>
                    {button.action && (
                        <button
                            onClick={() => onClear(button.name)}
                            className="px-4 py-2.5 bg-white text-[#EF4444] border border-[#FECACA] rounded-xl text-sm font-semibold cursor-pointer hover:bg-[#FEF2F2] transition-all duration-150"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                            Clear
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        className="px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white border-none rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150"
                        style={{ 
                            fontFamily: "'Space Grotesk', sans-serif",
                            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)'
                        }}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
