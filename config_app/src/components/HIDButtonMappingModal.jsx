import { useState } from "react";
import {
  HID_INPUT_TYPES,
  getInputLabel
} from "../services/HIDManager.js";
import KeyboardLayout from "./KeyboardLayout.jsx";
import ControllerDiagram from "./ControllerDiagram.jsx";
import AnalogPicker from "./AnalogPicker.jsx";

/**
 * Full-screen HID Button Mapping Modal
 * 
 * Two-column layout:
 * - Left: Visual input selector (keyboard/controller/analog)
 * - Right: Configuration panel (type selector, settings, actions)
 */
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

  // Check if selected input is analog
  const isAnalogInput = inputType === HID_INPUT_TYPES.ANALOG ||
    (inputType === HID_INPUT_TYPES.GAMEPAD && (
      selectedInput?.includes('trigger') ||
      selectedInput?.includes('stick_x') ||
      selectedInput?.includes('stick_y')
    ));

  const getTypeConfig = (type) => {
    switch (type) {
      case HID_INPUT_TYPES.GAMEPAD:
        return { color: '#5180C1', icon: '🎮', label: 'Gamepad' };
      case HID_INPUT_TYPES.KEYBOARD:
        return { color: '#4A90A4', icon: '⌨️', label: 'Keyboard' };
      case HID_INPUT_TYPES.ANALOG:
        return { color: '#6B9BD1', icon: '🕹️', label: 'Analog' };
      default:
        return { color: '#707070', icon: '?', label: 'Unknown' };
    }
  };

  const currentTypeConfig = getTypeConfig(inputType);

  const handleSave = () => {
    const resolvedAction = action || getInputLabel(inputType, selectedInput);
    const config = {
      type: inputType,
      input: selectedInput,
      action: resolvedAction,
      label: getInputLabel(inputType, selectedInput)
    };

    if (isAnalogInput) {
      config.analogConfig = analogConfig;
    }

    onSave(button.name, config);
  };

  const handleInputTypeChange = (type) => {
    setInputType(type);
    setSelectedInput(""); // Reset input when type changes
  };

  // Render the appropriate visual selector based on input type
  const renderVisualSelector = () => {
    switch (inputType) {
      case HID_INPUT_TYPES.KEYBOARD:
        return (
          <KeyboardLayout
            selectedInput={selectedInput}
            onSelect={setSelectedInput}
            accentColor={currentTypeConfig.color}
          />
        );
      case HID_INPUT_TYPES.GAMEPAD:
        return (
          <ControllerDiagram
            selectedInput={selectedInput}
            onSelect={setSelectedInput}
            accentColor={currentTypeConfig.color}
          />
        );
      case HID_INPUT_TYPES.ANALOG:
        return (
          <AnalogPicker
            selectedInput={selectedInput}
            onSelect={setSelectedInput}
            accentColor={currentTypeConfig.color}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[500] p-6 animate-fade-in"
      onClick={onCancel}
    >
        <div
          className="bg-[#CCCCCC] rounded-3xl w-full max-w-[1280px] h-[min(90vh,800px)] overflow-hidden flex animate-scale-in"
          style={{
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.06)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Column - Visual Selector */}
          <div 
            className="flex-1 flex flex-col items-center justify-center p-12 relative overflow-auto"
            style={{
              background: 'linear-gradient(135deg, #D9D9D9 0%, #C4C4C4 100%)',
              borderRight: '1px solid #A0A0A0'
            }}
          >
            {/* Decorative grid pattern */}
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                  linear-gradient(#A0A0A0 1px, transparent 1px),
                  linear-gradient(90deg, #A0A0A0 1px, transparent 1px)
                `,
                backgroundSize: '24px 24px'
              }}
            />
          
          {/* Content */}
          <div className="relative z-10 isolate">
            {renderVisualSelector()}
          </div>
        </div>

          {/* Right Column - Configuration */}
          <div className="w-[380px] flex flex-col bg-[#CCCCCC] shrink-0">
            {/* Header */}
            <div className="px-7 pt-7 pb-5">
              <div 
                className="text-[10px] font-semibold text-[#707070] uppercase tracking-[0.12em] mb-2"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Configure Input
              </div>
              <h2 
                className="m-0 text-2xl font-semibold text-[#333333] tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
              {button.name}
            </h2>
          </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto panel-scroll px-7 pb-6">
              {/* Input Type Selection */}
              <div className="mb-6">
                <label 
                  className="block mb-3 text-sm text-[#4A4A4A] font-medium"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Input Type
                </label>
                <div className="flex gap-2">
                  {[
                    { type: HID_INPUT_TYPES.GAMEPAD, ...getTypeConfig(HID_INPUT_TYPES.GAMEPAD) },
                    { type: HID_INPUT_TYPES.KEYBOARD, ...getTypeConfig(HID_INPUT_TYPES.KEYBOARD) },
                    { type: HID_INPUT_TYPES.ANALOG, ...getTypeConfig(HID_INPUT_TYPES.ANALOG) },
                  ].map(({ type, color, icon, label }) => {
                    const isActive = inputType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => handleInputTypeChange(type)}
                        className="flex-1 py-3 px-3 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150 flex flex-col items-center gap-1"
                        style={{ 
                          fontFamily: "'Space Grotesk', sans-serif",
                          background: isActive ? `${color}18` : '#B8B8B8',
                          border: isActive ? `2px solid ${color}` : '2px solid #A0A0A0',
                          color: isActive ? color : '#4A4A4A'
                        }}
                      >
                        <span className="text-lg">{icon}</span>
                        <span className="text-xs">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Input Display */}
              <div className="mb-6">
                <label 
                  className="block mb-3 text-sm text-[#4A4A4A] font-medium"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                Selected Input
              </label>
              
              {selectedInput ? (
                <div 
                  className="px-5 py-4 rounded-xl"
                  style={{
                    background: `${currentTypeConfig.color}08`,
                    border: `2px solid ${currentTypeConfig.color}30`
                  }}
                >
                  <div 
                    className="text-[10px] font-bold uppercase tracking-wider mb-1"
                    style={{ 
                      color: currentTypeConfig.color,
                      fontFamily: "'IBM Plex Mono', monospace"
                    }}
                  >
                    {currentTypeConfig.label}
                  </div>
                    <div 
                      className="text-lg font-semibold text-[#333333]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {getInputLabel(inputType, selectedInput)}
                    </div>
                    {isAnalogInput && (
                      <div 
                        className="mt-2 flex items-center gap-1.5 text-xs"
                        style={{ color: '#6B9BD1' }}
                      >
                        <span className="w-2 h-2 rounded-full bg-[#6B9BD1]" />
                        <span style={{ fontFamily: "'DM Sans', sans-serif" }}>Analog input</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    className="px-5 py-8 rounded-xl text-center"
                    style={{
                      background: '#B8B8B8',
                      border: '2px dashed #A0A0A0'
                    }}
                  >
                    <div 
                      className="text-sm text-[#707070]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Click an input on the left
                    </div>
                  </div>
                )}
              </div>

              {/* Analog Configuration */}
              {isAnalogInput && (
                <div 
                  className="mb-6 p-5 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(107, 155, 209, 0.08) 0%, rgba(107, 155, 209, 0.02) 100%)',
                    border: '1px solid rgba(107, 155, 209, 0.2)'
                  }}
                >
                  <label 
                    className="block mb-4 text-sm text-[#5180C1] font-semibold"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Analog Settings
                  </label>

                  <div className="mb-4">
                    <label 
                      className="flex justify-between mb-2 text-xs text-[#4A4A4A]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <span>Threshold</span>
                      <span 
                        className="text-[#5180C1] font-semibold"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {analogConfig.threshold.toFixed(2)}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.5"
                      step="0.05"
                      value={analogConfig.threshold}
                      onChange={(e) => setAnalogConfig({ ...analogConfig, threshold: parseFloat(e.target.value) })}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{ 
                        accentColor: '#5180C1',
                        background: 'linear-gradient(to right, #5180C1 0%, #5180C150 100%)'
                      }}
                    />
                  </div>

                  <div>
                    <label 
                      className="flex justify-between mb-2 text-xs text-[#4A4A4A]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <span>Sensitivity</span>
                      <span 
                        className="text-[#5180C1] font-semibold"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {analogConfig.sensitivity.toFixed(1)}x
                      </span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={analogConfig.sensitivity}
                      onChange={(e) => setAnalogConfig({ ...analogConfig, sensitivity: parseFloat(e.target.value) })}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{ 
                        accentColor: '#5180C1',
                        background: 'linear-gradient(to right, #5180C1 0%, #5180C150 100%)'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Action Assignment */}
              <div className="mb-6">
                <label 
                  className="block mb-3 text-sm text-[#4A4A4A] font-medium"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Action Name <span className="text-[#707070] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder={selectedInput ? `Default: ${getInputLabel(inputType, selectedInput)}` : "e.g., Jump, Fire"}
                  className="w-full px-4 py-3.5 bg-[#B8B8B8] hover:bg-[#C4C4C4] border-2 border-[#A0A0A0] rounded-xl text-sm text-[#333333] outline-none transition-all duration-150 focus:border-[#5180C1] focus:bg-[#C4C4C4]"
                  style={{ 
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(81, 128, 193, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && selectedInput) handleSave() }}
                />
              </div>

              {/* Current Mapping Display */}
              {button.action && (
                <div 
                  className="p-4 rounded-xl mb-2"
                  style={{
                    background: '#B8B8B8',
                    border: '1px solid #A0A0A0'
                  }}
                >
                  <div 
                    className="text-[10px] text-[#707070] mb-1.5 font-semibold uppercase tracking-wider"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Current Mapping
                  </div>
                  <div 
                    className="text-sm text-[#4A4A4A]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {button.label || button.input} → {button.action}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div 
              className="px-7 py-5 border-t border-[#B8B8B8] flex flex-col gap-3"
              style={{ background: '#C4C4C4' }}
            >
              {/* Primary actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={!selectedInput}
                  className={`flex-1 py-3.5 border-none rounded-xl text-sm font-semibold transition-all duration-150
                    ${selectedInput
                      ? 'bg-[#5180C1] hover:bg-[#4571B0] text-white cursor-pointer'
                      : 'bg-[#A0A0A0] text-[#707070] cursor-not-allowed'
                    }`}
                  style={{ 
                    fontFamily: "'Space Grotesk', sans-serif",
                    boxShadow: selectedInput ? '0 4px 12px rgba(81, 128, 193, 0.3)' : 'none'
                  }}
                >
                  Save Mapping
                </button>
              </div>
              
              {/* Secondary actions */}
              <div className="flex gap-3 justify-between">
                {button.action && (
                  <button
                    onClick={() => onClear(button.name)}
                    className="px-4 py-2 bg-[#CCCCCC] text-[#EF4444] border border-[#FECACA] rounded-lg text-xs font-semibold cursor-pointer hover:bg-[#FEE2E2] transition-all duration-150"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Clear Mapping
                  </button>
                )}
                <button
                  onClick={onCancel}
                  className="px-4 py-2 bg-transparent text-[#4A4A4A] border-none text-xs font-medium cursor-pointer hover:text-[#333333] transition-colors ml-auto"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
