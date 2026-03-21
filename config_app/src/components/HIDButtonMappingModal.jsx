import { useState } from "react";
import {
  HID_INPUT_TYPES,
  getInputOptions,
  getInputLabel
} from "../services/HIDManager.js";

// Visual Grid Picker for input selection
function InputGridPicker({ inputType, selectedInput, onSelect, accentColor }) {
  const inputOptions = getInputOptions(inputType);
  
  // Group options by category
  const groupedOptions = inputOptions.reduce((groups, option) => {
    const category = option.category || option.type || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(option);
    return groups;
  }, {});

  // Get grid columns based on input type
  const getGridCols = () => {
    switch (inputType) {
      case HID_INPUT_TYPES.KEYBOARD:
        return 'grid-cols-6'; // 6 columns for letters
      case HID_INPUT_TYPES.GAMEPAD:
        return 'grid-cols-4'; // 4 columns for gamepad
      case HID_INPUT_TYPES.ANALOG:
        return 'grid-cols-3'; // 3 columns for analog
      default:
        return 'grid-cols-4';
    }
  };

  // Get tile size based on input type
  const getTileStyle = (isSelected, isAnalog) => {
    const base = {
      fontFamily: inputType === HID_INPUT_TYPES.KEYBOARD ? "'IBM Plex Mono', monospace" : "'DM Sans', sans-serif",
    };
    
    if (isSelected) {
      return {
        ...base,
        background: `${accentColor}15`,
        border: `2px solid ${accentColor}`,
        color: accentColor,
        boxShadow: `0 0 0 3px ${accentColor}20`
      };
    }
    
    return {
      ...base,
      background: '#F9FAFB',
      border: '1px solid #E4E4E7',
      color: '#18181B'
    };
  };

  return (
    <div className="space-y-5">
      {Object.entries(groupedOptions).map(([category, options]) => (
        <div key={category}>
          {/* Category Label */}
          <div 
            className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-[0.1em] mb-2.5 px-1"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {category}
          </div>
          
          {/* Grid of options */}
          <div className={`grid ${getGridCols()} gap-2`}>
            {options.map((option) => {
              const isSelected = selectedInput === option.value;
              const isAnalog = option.isAnalog || inputType === HID_INPUT_TYPES.ANALOG;
              
              return (
                <button
                  key={option.value}
                  onClick={() => onSelect(option.value)}
                  className={`
                    relative px-2 py-2.5 rounded-lg text-xs font-medium
                    cursor-pointer transition-all duration-150
                    hover:scale-[1.02] active:scale-[0.98]
                    ${isSelected ? 'z-10' : ''}
                  `}
                  style={getTileStyle(isSelected, isAnalog)}
                  title={option.label}
                >
                  {/* Compact label */}
                  <span className="block truncate text-center">
                    {getCompactLabel(option.label, inputType)}
                  </span>
                  
                  {/* Analog indicator dot */}
                  {isAnalog && inputType === HID_INPUT_TYPES.GAMEPAD && (
                    <span 
                      className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                      style={{ background: '#F97316' }}
                      title="Analog input"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper to create compact labels for tiles
function getCompactLabel(label, inputType) {
  if (inputType === HID_INPUT_TYPES.KEYBOARD) {
    // For keyboard, use short forms
    const shortForms = {
      'Up Arrow': '↑',
      'Down Arrow': '↓',
      'Left Arrow': '←',
      'Right Arrow': '→',
      'Space': '␣',
      'Enter': '↵',
      'Escape': 'Esc',
      'Backspace': '⌫',
      'Delete': 'Del',
      'Tab': '⇥',
      'Shift': '⇧',
      'Control': 'Ctrl',
      'Alt': 'Alt',
    };
    return shortForms[label] || label;
  }
  
  if (inputType === HID_INPUT_TYPES.GAMEPAD) {
    // For gamepad, abbreviate
    return label
      .replace(' Button', '')
      .replace('D-Pad ', '')
      .replace('Left ', 'L ')
      .replace('Right ', 'R ')
      .replace(' (LB)', '')
      .replace(' (RB)', '')
      .replace(' (LT)', '')
      .replace(' (RT)', '')
      .replace(' Click', ' ⏺')
      .replace('X-Axis', 'X')
      .replace('Y-Axis', 'Y')
      .replace('Bumper', 'Bump')
      .replace('Trigger', 'Trig')
      .replace('Stick', 'Stk')
      .replace('Menu (Start)', 'Menu')
      .replace('View (Back)', 'View')
      .replace('Home/Xbox', 'Home');
  }
  
  if (inputType === HID_INPUT_TYPES.ANALOG) {
    return label
      .replace('Left ', 'L ')
      .replace('Right ', 'R ')
      .replace(' X-Axis', ' X')
      .replace(' Y-Axis', ' Y')
      .replace(' Trigger', ' Trig');
  }
  
  return label;
}

// Enhanced HID Configuration Modal with visual grid picker
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
    if (!isActive) return { bg: '#F4F4F5', border: '#E4E4E7', text: '#71717A' };
    switch (type) {
      case HID_INPUT_TYPES.GAMEPAD:
        return { bg: 'rgba(124, 58, 237, 0.1)', border: '#7C3AED', text: '#7C3AED' };
      case HID_INPUT_TYPES.KEYBOARD:
        return { bg: 'rgba(6, 182, 212, 0.1)', border: '#06B6D4', text: '#06B6D4' };
      case HID_INPUT_TYPES.ANALOG:
        return { bg: 'rgba(249, 115, 22, 0.1)', border: '#F97316', text: '#F97316' };
      default:
        return { bg: '#F4F4F5', border: '#E4E4E7', text: '#71717A' };
    }
  };

  const getAccentColor = () => {
    switch (inputType) {
      case HID_INPUT_TYPES.GAMEPAD: return '#7C3AED';
      case HID_INPUT_TYPES.KEYBOARD: return '#06B6D4';
      case HID_INPUT_TYPES.ANALOG: return '#F97316';
      default: return '#A1A1AA';
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

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl w-[560px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
        style={{
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.03)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="px-7 pt-6 pb-5 border-b border-[#F4F4F5]">
          <div 
            className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-[0.12em] mb-2"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Configure Input
          </div>

          <h2 
            className="m-0 text-xl font-semibold text-[#18181B] tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {button.name}
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto panel-scroll px-7 py-5">
          {/* Input Type Selection */}
          <div className="mb-6">
            <label 
              className="block mb-3 text-sm text-[#52525B] font-medium"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Input Type
            </label>
            <div className="flex gap-2">
              {[
                { type: HID_INPUT_TYPES.GAMEPAD, label: 'Gamepad', icon: '🎮' },
                { type: HID_INPUT_TYPES.KEYBOARD, label: 'Keyboard', icon: '⌨️' },
                { type: HID_INPUT_TYPES.ANALOG, label: 'Analog', icon: '🕹️' },
              ].map(({ type, label, icon }) => {
                const styles = getTypeStyles(type, inputType === type);
                return (
                  <button
                    key={type}
                    onClick={() => handleInputTypeChange(type)}
                    className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150"
                    style={{ 
                      fontFamily: "'Space Grotesk', sans-serif",
                      background: styles.bg,
                      border: `2px solid ${styles.border}`,
                      color: styles.text
                    }}
                  >
                    <span className="mr-1.5">{icon}</span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input Selection Grid */}
          <div className="mb-6">
            <label 
              className="block mb-3 text-sm text-[#52525B] font-medium"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Select {inputType === HID_INPUT_TYPES.GAMEPAD ? "Button" : inputType === HID_INPUT_TYPES.KEYBOARD ? "Key" : "Axis"}
            </label>
            
            <div 
              className="p-4 rounded-xl max-h-[240px] overflow-y-auto panel-scroll"
              style={{
                background: '#FAFAFA',
                border: '1px solid #E4E4E7'
              }}
            >
              <InputGridPicker
                inputType={inputType}
                selectedInput={selectedInput}
                onSelect={setSelectedInput}
                accentColor={accentColor}
              />
            </div>
            
            {/* Selected input preview */}
            {selectedInput && (
              <div 
                className="mt-3 px-4 py-2.5 rounded-lg flex items-center gap-2"
                style={{
                  background: `${accentColor}08`,
                  border: `1px solid ${accentColor}25`
                }}
              >
                <span 
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ 
                    color: accentColor,
                    fontFamily: "'IBM Plex Mono', monospace"
                  }}
                >
                  Selected:
                </span>
                <span 
                  className="text-sm font-medium"
                  style={{ 
                    color: '#18181B',
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                >
                  {getInputLabel(inputType, selectedInput)}
                </span>
              </div>
            )}
          </div>

          {/* Analog Configuration */}
          {isAnalog && (
            <div 
              className="mb-6 p-5 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.04) 0%, rgba(249, 115, 22, 0.01) 100%)',
                border: '1px solid rgba(249, 115, 22, 0.15)'
              }}
            >
              <label 
                className="block mb-4 text-sm text-[#F97316] font-semibold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Analog Settings
              </label>

              <div className="mb-4">
                <label 
                  className="flex justify-between mb-2 text-xs text-[#52525B]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <span>Threshold</span>
                  <span 
                    className="font-mono text-[#F97316]"
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
                  className="w-full"
                  style={{ accentColor: '#F97316' }}
                />
              </div>

              <div>
                <label 
                  className="flex justify-between mb-2 text-xs text-[#52525B]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <span>Sensitivity</span>
                  <span 
                    className="font-mono text-[#F97316]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {analogConfig.sensitivity.toFixed(1)}
                  </span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={analogConfig.sensitivity}
                  onChange={(e) => setAnalogConfig({ ...analogConfig, sensitivity: parseFloat(e.target.value) })}
                  className="w-full"
                  style={{ accentColor: '#F97316' }}
                />
              </div>
            </div>
          )}

          {/* Action Assignment */}
          <div className="mb-5">
            <label 
              className="block mb-3 text-sm text-[#52525B] font-medium"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Action Name <span className="text-[#A1A1AA] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder={selectedInput ? `Default: ${getInputLabel(inputType, selectedInput)}` : "e.g., Jump, Fire, Move Left"}
              className="w-full px-4 py-3 bg-[#F9FAFB] hover:bg-white border border-[#E4E4E7] rounded-xl text-sm text-[#18181B] outline-none transition-all duration-150 focus:border-[#7C3AED] focus:bg-white"
              style={{ 
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)';
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
              className="p-4 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #F9FAFB 0%, #F4F4F5 100%)',
                border: '1px solid #E4E4E7'
              }}
            >
              <div 
                className="text-[10px] text-[#A1A1AA] mb-1.5 font-semibold uppercase tracking-wider"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Current Mapping
              </div>
              <div 
                className="text-sm text-[#52525B]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {button.type}: {button.label || button.input} → {button.action}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed */}
        <div 
          className="px-7 py-5 border-t border-[#F4F4F5] flex gap-3 justify-end"
          style={{ background: '#FAFAFA' }}
        >
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
              className="px-5 py-2.5 bg-white text-[#EF4444] border border-[#FECACA] rounded-xl text-sm font-semibold cursor-pointer hover:bg-[#FEF2F2] transition-all duration-150"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Clear
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!selectedInput}
            className={`px-6 py-2.5 border-none rounded-xl text-sm font-semibold transition-all duration-150
              ${selectedInput
                ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white cursor-pointer'
                : 'bg-[#E4E4E7] text-[#A1A1AA] cursor-not-allowed'
              }`}
            style={{ 
              fontFamily: "'Space Grotesk', sans-serif",
              boxShadow: selectedInput ? '0 2px 8px rgba(124, 58, 237, 0.25)' : 'none'
            }}
          >
            Save Mapping
          </button>
        </div>
      </div>
    </div>
  );
}
