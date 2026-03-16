import { useState } from "react";
import {
  HID_INPUT_TYPES,
  getInputOptions,
  getInputLabel
} from "../services/HIDManager.js";

// Enhanced HID Configuration Modal
export default function ButtonMappingModal({ button, onSave, onCancel, onClear }) {
  const [inputType, setInputType] = useState(button.type || HID_INPUT_TYPES.GAMEPAD);
  const [selectedInput, setSelectedInput] = useState(button.input || "");
  const [action, setAction] = useState(button.action || "");
  const [analogConfig, setAnalogConfig] = useState(button.analogConfig || {
    threshold: 0.2,
    sensitivity: 1.0,
    axis: 'x',
    direction: 'bidirectional'
  });

  const inputOptions = getInputOptions(inputType);
  const isAnalog = inputType === HID_INPUT_TYPES.ANALOG ||
    (inputType === HID_INPUT_TYPES.GAMEPAD && inputOptions.find(opt => opt.value === selectedInput)?.isAnalog);

  const getTypeStyles = (type, isActive) => {
    if (!isActive) return 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100';
    switch (type) {
      case HID_INPUT_TYPES.GAMEPAD:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case HID_INPUT_TYPES.KEYBOARD:
        return 'bg-blue-50 text-[#0071E3] border-blue-200';
      case HID_INPUT_TYPES.ANALOG:
        return 'bg-orange-50 text-orange-600 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  const getAccentColor = () => {
    switch (inputType) {
      case HID_INPUT_TYPES.GAMEPAD: return '#5856D6';
      case HID_INPUT_TYPES.KEYBOARD: return '#0071E3';
      case HID_INPUT_TYPES.ANALOG: return '#FF9500';
      default: return '#86868b';
    }
  };

  const accentColor = getAccentColor();

  const handleSave = () => {
    const resolvedAction = action || getInputLabel(inputType, selectedInput);
    const config = {
      type: inputType,
      input: selectedInput,
      action: resolvedAction,
      label: getInputLabel(inputType, selectedInput)
    };

    if (isAnalog) {
      config.analogConfig = analogConfig;
    }

    onSave(button.name, config);
  };

  const handleInputTypeChange = (type) => {
    setInputType(type);
    setSelectedInput(""); // Reset input when type changes
  };

  const groupedOptions = inputOptions.reduce((groups, option) => {
    const category = option.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(option);
    return groups;
  }, {});

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] p-6 w-[480px] max-w-[90%] max-h-[90vh] overflow-y-auto border border-gray-100 panel-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Configure Input
        </div>

        <h2 className="m-0 mb-5 text-lg font-semibold text-gray-900">
          {button.name}
        </h2>

        {/* Input Type Selection */}
        <div className="mb-5">
          <label className="block mb-2 text-sm text-gray-500">
            Input Type
          </label>
          <div className="flex gap-2">
            {[
              { type: HID_INPUT_TYPES.GAMEPAD, label: 'Gamepad' },
              { type: HID_INPUT_TYPES.KEYBOARD, label: 'Keyboard' },
              { type: HID_INPUT_TYPES.ANALOG, label: 'Analog' },
            ].map(({ type, label }) => (
              <button
                key={type}
                onClick={() => handleInputTypeChange(type)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider border cursor-pointer transition-all duration-150 ${getTypeStyles(type, inputType === type)}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Selection */}
        <div className="mb-5">
          <label className="block mb-2 text-sm text-gray-500">
            Select {inputType === HID_INPUT_TYPES.GAMEPAD ? "Button" : inputType === HID_INPUT_TYPES.KEYBOARD ? "Key" : "Axis"}
          </label>
          <select
            value={selectedInput}
            onChange={(e) => setSelectedInput(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none transition-colors cursor-pointer"
            style={{ borderColor: selectedInput ? accentColor + '40' : undefined }}
          >
            <option value="">Select an input...</option>
            {Object.entries(groupedOptions).map(([category, options]) => (
              <optgroup key={category} label={category}>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Analog Configuration */}
        {isAnalog && (
          <div className="mb-5 p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <label className="block mb-3 text-sm text-gray-500 font-medium">
              Analog Settings
            </label>

            <div className="mb-3">
              <label className="block mb-1.5 text-xs text-gray-500">
                Threshold: {analogConfig.threshold.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={analogConfig.threshold}
                onChange={(e) => setAnalogConfig({ ...analogConfig, threshold: parseFloat(e.target.value) })}
                className="w-full"
                style={{ accentColor }}
              />
            </div>

            <div>
              <label className="block mb-1.5 text-xs text-gray-500">
                Sensitivity: {analogConfig.sensitivity.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={analogConfig.sensitivity}
                onChange={(e) => setAnalogConfig({ ...analogConfig, sensitivity: parseFloat(e.target.value) })}
                className="w-full"
                style={{ accentColor }}
              />
            </div>
          </div>
        )}

        {/* Action Assignment */}
        <div className="mb-5">
          <label className="block mb-2 text-sm text-gray-500">
            Action Name
          </label>
          <input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g., Jump, Fire, Move Left"
            autoFocus
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none transition-colors focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/10"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          />
        </div>

        {/* Current Mapping Display */}
        {button.action && (
          <div className="p-3.5 bg-gray-50 rounded-2xl mb-5 border border-gray-100">
            <div className="text-[11px] text-gray-400 mb-1 font-medium">
              Current Mapping
            </div>
            <div className="text-sm text-gray-600">
              {button.type}: {button.label || button.input} → {button.action}
            </div>
          </div>
        )}

        {/* Action Buttons */}
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
            disabled={!selectedInput}
            className={`px-5 py-2 border-none rounded-xl text-sm font-medium transition-colors
              ${selectedInput
                ? 'bg-[#0071E3] hover:bg-[#0077ED] text-white cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
