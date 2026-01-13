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

  const getTypeTone = (type) => {
    switch (type) {
      case HID_INPUT_TYPES.GAMEPAD:
        return { color: "#5b7cfa", border: "rgba(91, 124, 250, 0.3)" };
      case HID_INPUT_TYPES.KEYBOARD:
        return { color: "var(--oa-accent)", border: "rgba(95, 208, 196, 0.3)" };
      case HID_INPUT_TYPES.ANALOG:
        return { color: "var(--oa-warning)", border: "rgba(240, 192, 92, 0.3)" };
      default:
        return { color: "var(--oa-muted)", border: "rgba(142, 154, 168, 0.3)" };
    }
  };

  const activeTone = getTypeTone(inputType);
  const activeTypeColor = activeTone.color;

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
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(6, 10, 14, 0.72)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      backdropFilter: "blur(2px)",
    }}
    onClick={onCancel}
    >
      <div style={{
        background: "linear-gradient(180deg, rgba(18, 24, 32, 0.96) 0%, rgba(10, 14, 19, 0.92) 100%)",
        borderRadius: "16px",
        padding: "24px",
        width: "480px",
        maxWidth: "90%",
        maxHeight: "90vh",
        overflowY: "auto",
        border: "1px solid var(--oa-panel-border)",
        boxShadow: "var(--oa-shadow-soft)",
      }}
      onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          fontSize: "11px",
          fontWeight: "600",
          color: "var(--oa-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "8px",
        }}>
          Configure Input
        </div>
        
        <h2 style={{
          margin: "0 0 20px 0",
          fontSize: "18px",
          fontWeight: "600",
          color: "var(--oa-text)",
        }}>
          {button.name}
        </h2>

        {/* Input Type Selection */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "13px",
            color: "var(--oa-muted)",
          }}>
            Input Type
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => handleInputTypeChange(HID_INPUT_TYPES.GAMEPAD)}
              style={{
                flex: 1,
                padding: "8px",
                background: inputType === HID_INPUT_TYPES.GAMEPAD ? "rgba(91, 124, 250, 0.18)" : "rgba(255,255,255,0.03)",
                color: inputType === HID_INPUT_TYPES.GAMEPAD ? "#dbe6ff" : "var(--oa-muted)",
                border: inputType === HID_INPUT_TYPES.GAMEPAD ? "1px solid rgba(91, 124, 250, 0.5)" : "1px solid var(--oa-panel-border)",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Gamepad
            </button>
            <button
              onClick={() => handleInputTypeChange(HID_INPUT_TYPES.KEYBOARD)}
              style={{
                flex: 1,
                padding: "8px",
                background: inputType === HID_INPUT_TYPES.KEYBOARD ? "rgba(95, 208, 196, 0.18)" : "rgba(255,255,255,0.03)",
                color: inputType === HID_INPUT_TYPES.KEYBOARD ? "#0b0d10" : "var(--oa-muted)",
                border: inputType === HID_INPUT_TYPES.KEYBOARD ? "1px solid rgba(95, 208, 196, 0.5)" : "1px solid var(--oa-panel-border)",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Keyboard
            </button>
            <button
              onClick={() => handleInputTypeChange(HID_INPUT_TYPES.ANALOG)}
              style={{
                flex: 1,
                padding: "8px",
                background: inputType === HID_INPUT_TYPES.ANALOG ? "rgba(240, 192, 92, 0.18)" : "rgba(255,255,255,0.03)",
                color: inputType === HID_INPUT_TYPES.ANALOG ? "#251c09" : "var(--oa-muted)",
                border: inputType === HID_INPUT_TYPES.ANALOG ? "1px solid rgba(240, 192, 92, 0.5)" : "1px solid var(--oa-panel-border)",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Analog
            </button>
          </div>
        </div>

        {/* Input Selection */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "13px",
            color: "var(--oa-muted)",
          }}>
            Select {inputType === HID_INPUT_TYPES.GAMEPAD ? "Button" : inputType === HID_INPUT_TYPES.KEYBOARD ? "Key" : "Axis"}
          </label>
          <select
            value={selectedInput}
            onChange={(e) => setSelectedInput(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${activeTone.border}`,
              borderRadius: "8px",
              fontSize: "14px",
              color: "var(--oa-text)",
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
            background: "rgba(255,255,255,0.03)", 
            borderRadius: "10px", 
            border: `1px solid ${activeTone.border}` 
          }}>
            <label style={{
              display: "block",
              marginBottom: "12px",
              fontSize: "13px",
              color: "var(--oa-muted)",
            }}>
              Analog Settings
            </label>
            
            <div style={{ marginBottom: "12px" }}>
              <label style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "12px",
                color: "var(--oa-muted)",
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
                style={{ width: "100%", accentColor: activeTypeColor }}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                marginBottom: "4px",
                fontSize: "12px",
                color: "var(--oa-muted)",
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
                style={{ width: "100%", accentColor: activeTypeColor }}
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
            color: "var(--oa-muted)",
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
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              fontSize: "14px",
              color: "var(--oa-text)",
              outline: "none",
              transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => e.target.style.borderColor = "var(--oa-accent)"}
            onBlur={(e) => e.target.style.borderColor = "var(--oa-panel-border)"}
            onKeyDown={(e) => { if(e.key === 'Enter') handleSave() }}
          />
        </div>

        {/* Current Mapping Display */}
        {button.action && (
          <div style={{
            padding: "12px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "10px",
            marginBottom: "20px",
            border: "1px solid rgba(255,255,255,0.06)"
          }}>
            <div style={{
              fontSize: "11px",
              color: "var(--oa-muted)",
              marginBottom: "4px",
            }}>
              Current Mapping
            </div>
            <div style={{
              fontSize: "13px",
              color: "var(--oa-muted)",
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
              color: "var(--oa-muted)",
              border: "none",
              fontSize: "13px",
              cursor: "pointer",
            }}
            onMouseOver={(e) => e.target.style.color = "var(--oa-text)"}
            onMouseOut={(e) => e.target.style.color = "var(--oa-muted)"}
          >
            Cancel
          </button>
          {button.action && (
            <button
              onClick={() => onClear(button.name)}
              style={{
                padding: "8px 12px",
                background: "rgba(230, 118, 108, 0.12)",
                color: "var(--oa-danger)",
                border: "1px solid rgba(230, 118, 108, 0.35)",
                borderRadius: "8px",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!selectedInput}
            style={{
              padding: "8px 20px",
              background: selectedInput ? "var(--oa-accent)" : "rgba(255,255,255,0.08)",
              color: selectedInput ? "#0b0d10" : "var(--oa-muted)",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "500",
              cursor: selectedInput ? "pointer" : "not-allowed",
            }}
            onMouseOver={(e) => {
              if (selectedInput) e.target.style.background = "var(--oa-accent-strong)";
            }}
            onMouseOut={(e) => {
              if (selectedInput) e.target.style.background = "var(--oa-accent)";
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
