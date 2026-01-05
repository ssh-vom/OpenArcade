import { useState, useEffect } from "react";
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

  const handleSave = () => {
    const config = {
      type: inputType,
      input: selectedInput,
      action,
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
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      backdropFilter: "blur(2px)",
    }}
    onClick={onCancel}
    >
      <div style={{
        background: "#171717",
        borderRadius: "8px",
        padding: "24px",
        width: "480px",
        maxWidth: "90%",
        maxHeight: "90vh",
        overflowY: "auto",
        border: "1px solid #333",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)",
      }}
      onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          fontSize: "11px",
          fontWeight: "600",
          color: "#525252",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "8px",
        }}>
          Configure Input
        </div>
        
        <h2 style={{
          margin: "0 0 20px 0",
          fontSize: "18px",
          fontWeight: "600",
          color: "#fff",
        }}>
          {button.name}
        </h2>

        {/* Input Type Selection */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "13px",
            color: "#a3a3a3",
          }}>
            Input Type
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => handleInputTypeChange(HID_INPUT_TYPES.GAMEPAD)}
              style={{
                flex: 1,
                padding: "8px",
                background: inputType === HID_INPUT_TYPES.GAMEPAD ? "#3b82f6" : "#262626",
                color: inputType === HID_INPUT_TYPES.GAMEPAD ? "white" : "#a3a3a3",
                border: "1px solid #404040",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              🎮 Gamepad
            </button>
            <button
              onClick={() => handleInputTypeChange(HID_INPUT_TYPES.KEYBOARD)}
              style={{
                flex: 1,
                padding: "8px",
                background: inputType === HID_INPUT_TYPES.KEYBOARD ? "#3b82f6" : "#262626",
                color: inputType === HID_INPUT_TYPES.KEYBOARD ? "white" : "#a3a3a3",
                border: "1px solid #404040",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              ⌨️ Keyboard
            </button>
            <button
              onClick={() => handleInputTypeChange(HID_INPUT_TYPES.ANALOG)}
              style={{
                flex: 1,
                padding: "8px",
                background: inputType === HID_INPUT_TYPES.ANALOG ? "#3b82f6" : "#262626",
                color: inputType === HID_INPUT_TYPES.ANALOG ? "white" : "#a3a3a3",
                border: "1px solid #404040",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              🕹️ Analog
            </button>
          </div>
        </div>

        {/* Input Selection */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "13px",
            color: "#a3a3a3",
          }}>
            Select {inputType === HID_INPUT_TYPES.GAMEPAD ? "Button" : inputType === HID_INPUT_TYPES.KEYBOARD ? "Key" : "Axis"}
          </label>
          <select
            value={selectedInput}
            onChange={(e) => setSelectedInput(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "#262626",
              border: "1px solid #404040",
              borderRadius: "6px",
              fontSize: "14px",
              color: "white",
              outline: "none",
            }}
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
          <div style={{ 
            marginBottom: "20px", 
            padding: "16px", 
            background: "#1a1a1a", 
            borderRadius: "6px", 
            border: "1px solid #333" 
          }}>
            <label style={{
              display: "block",
              marginBottom: "12px",
              fontSize: "13px",
              color: "#a3a3a3",
            }}>
              Analog Settings
            </label>
            
            <div style={{ marginBottom: "12px" }}>
              <label style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "12px",
                color: "#737373",
              }}>
                Threshold: {analogConfig.threshold.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={analogConfig.threshold}
                onChange={(e) => setAnalogConfig({...analogConfig, threshold: parseFloat(e.target.value)})}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "12px",
                color: "#737373",
              }}>
                Sensitivity: {analogConfig.sensitivity.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={analogConfig.sensitivity}
                onChange={(e) => setAnalogConfig({...analogConfig, sensitivity: parseFloat(e.target.value)})}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        )}

        {/* Action Assignment */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "13px",
            color: "#a3a3a3",
          }}>
            Action Name
          </label>
          <input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g., Jump, Fire, Move Left"
            autoFocus
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "#262626",
              border: "1px solid #404040",
              borderRadius: "6px",
              fontSize: "14px",
              color: "white",
              outline: "none",
              transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
            onBlur={(e) => e.target.style.borderColor = "#404040"}
            onKeyDown={(e) => { if(e.key === 'Enter') handleSave() }}
          />
        </div>

        {/* Current Mapping Display */}
        {button.action && (
          <div style={{
            padding: "12px",
            background: "#1a1a1a",
            borderRadius: "4px",
            marginBottom: "20px",
            border: "1px solid #333"
          }}>
            <div style={{
              fontSize: "11px",
              color: "#525252",
              marginBottom: "4px",
            }}>
              Current Mapping
            </div>
            <div style={{
              fontSize: "13px",
              color: "#a3a3a3",
            }}>
              {button.type}: {button.label || button.input} → {button.action}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end",
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              background: "transparent",
              color: "#a3a3a3",
              border: "none",
              fontSize: "13px",
              cursor: "pointer",
            }}
            onMouseOver={(e) => e.target.style.color = "#fff"}
            onMouseOut={(e) => e.target.style.color = "#a3a3a3"}
          >
            Cancel
          </button>
          {button.action && (
            <button
              onClick={() => onClear(button.name)}
              style={{
                padding: "8px 12px",
                background: "rgba(239, 68, 68, 0.1)",
                color: "#f87171",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "4px",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!selectedInput || !action}
            style={{
              padding: "8px 20px",
              background: selectedInput && action ? "#3b82f6" : "#404040",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: "500",
              cursor: selectedInput && action ? "pointer" : "not-allowed",
            }}
            onMouseOver={(e) => {
              if (selectedInput && action) e.target.style.background = "#2563eb";
            }}
            onMouseOut={(e) => {
              if (selectedInput && action) e.target.style.background = "#3b82f6";
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}