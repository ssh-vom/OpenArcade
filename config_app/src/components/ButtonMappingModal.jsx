import { useState } from "react";

export default function ButtonMappingModal({ button, onSave, onCancel, onClear }) {
    const [action, setAction] = useState(button.action || "");

    const handleSave = () => {
        onSave(button.name, action);
    };

    return (
        <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] p-6 w-[380px] max-w-[90%] border border-gray-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    Configure Input
                </div>

                <h2 className="m-0 mb-5 text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {button.name}
                </h2>

                <div className="mb-5">
                    <label className="block mb-2 text-sm text-gray-500">
                        Assign Action
                    </label>
                    <input
                        type="text"
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        placeholder="e.g., Jump"
                        autoFocus
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none transition-colors focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/10"
                        onKeyDown={(e) => { if(e.key === 'Enter') handleSave() }}
                    />
                </div>

                <div className="flex gap-2.5 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-transparent text-gray-500 border-none text-sm cursor-pointer hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    {button.action && (
                        <button
                            onClick={() => onClear(button.name)}
                            className="px-3.5 py-2 bg-red-50 text-red-500 border border-red-200 rounded-xl text-sm cursor-pointer hover:bg-red-100 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white border-none rounded-xl text-sm font-medium cursor-pointer transition-colors"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
