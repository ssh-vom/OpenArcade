/**
 * KeyboardLayout - A realistic QWERTY keyboard visualization for input selection
 * 
 * Renders a full keyboard layout with clickable keys that map to HID keyboard inputs.
 */

// Map from our input schema keys to display properties
const KEY_DISPLAY = {
  // Letters
  key_a: { label: 'A' },
  key_b: { label: 'B' },
  key_c: { label: 'C' },
  key_d: { label: 'D' },
  key_e: { label: 'E' },
  key_f: { label: 'F' },
  key_g: { label: 'G' },
  key_h: { label: 'H' },
  key_i: { label: 'I' },
  key_j: { label: 'J' },
  key_k: { label: 'K' },
  key_l: { label: 'L' },
  key_m: { label: 'M' },
  key_n: { label: 'N' },
  key_o: { label: 'O' },
  key_p: { label: 'P' },
  key_q: { label: 'Q' },
  key_r: { label: 'R' },
  key_s: { label: 'S' },
  key_t: { label: 'T' },
  key_u: { label: 'U' },
  key_v: { label: 'V' },
  key_w: { label: 'W' },
  key_x: { label: 'X' },
  key_y: { label: 'Y' },
  key_z: { label: 'Z' },
  // Numbers
  key_1: { label: '1' },
  key_2: { label: '2' },
  key_3: { label: '3' },
  key_4: { label: '4' },
  key_5: { label: '5' },
  key_6: { label: '6' },
  key_7: { label: '7' },
  key_8: { label: '8' },
  key_9: { label: '9' },
  key_0: { label: '0' },
  // Special
  key_space: { label: 'Space', width: 5 },
  key_enter: { label: 'Enter', width: 1.75 },
  key_escape: { label: 'Esc' },
  key_tab: { label: 'Tab', width: 1.25 },
  key_backspace: { label: '⌫', width: 1.5 },
  key_delete: { label: 'Del' },
  key_shift: { label: 'Shift', width: 1.75 },
  key_control: { label: 'Ctrl', width: 1.25 },
  key_alt: { label: 'Alt', width: 1.25 },
  // Navigation
  key_up: { label: '↑' },
  key_down: { label: '↓' },
  key_left: { label: '←' },
  key_right: { label: '→' },
  // Function keys
  key_f1: { label: 'F1' },
  key_f2: { label: 'F2' },
  key_f3: { label: 'F3' },
  key_f4: { label: 'F4' },
  key_f5: { label: 'F5' },
  key_f6: { label: 'F6' },
  key_f7: { label: 'F7' },
  key_f8: { label: 'F8' },
  key_f9: { label: 'F9' },
  key_f10: { label: 'F10' },
  key_f11: { label: 'F11' },
  key_f12: { label: 'F12' },
};

// Single key component
function Key({ keyId, selected, onSelect, accentColor, width = 1 }) {
  const keyInfo = KEY_DISPLAY[keyId];
  if (!keyInfo) return null;

  const keyWidth = keyInfo.width || width;
  const baseSize = 52; // pixels per unit
  const gap = 8;
  const calculatedWidth = keyWidth * baseSize + (keyWidth - 1) * gap;
  
  const isSelected = selected === keyId;
  
  const baseStyle = {
    width: `${calculatedWidth}px`,
    height: '52px',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: keyInfo.label.length > 3 ? '11px' : keyInfo.label.length > 2 ? '12px' : '15px',
    fontWeight: '600',
  };

  const selectedStyle = isSelected ? {
    background: `${accentColor}15`,
    border: `2px solid ${accentColor}`,
    color: accentColor,
    boxShadow: `0 0 0 4px ${accentColor}20, 0 4px 12px ${accentColor}25`,
    transform: 'translateY(-2px) scale(1.02)',
  } : {
    background: 'white',
    border: '1px solid #D4D4D8',
    color: '#18181B',
    boxShadow: '0 2px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  };

  return (
    <button
      onClick={() => onSelect(keyId)}
      className="rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 hover:border-[#A1A1AA] hover:shadow-lg hover:-translate-y-0.5 active:scale-95 shrink-0"
      style={{ ...baseStyle, ...selectedStyle }}
      title={keyInfo.label}
    >
      {keyInfo.label}
    </button>
  );
}

// Spacer for gaps in function row
function Spacer({ size = 1 }) {
  return <div style={{ width: `${size * 20}px` }} />;
}

// Main keyboard layout component
export default function KeyboardLayout({ selectedInput, onSelect, accentColor = '#06B6D4' }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Function Row */}
      <div className="flex items-center gap-2">
        <Key keyId="key_escape" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Spacer size={2} />
        <Key keyId="key_f1" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_f2" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_f3" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_f4" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Spacer />
        <Key keyId="key_f5" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_f6" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_f7" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_f8" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Spacer />
        <Key keyId="key_f9" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_f10" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_f11" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_f12" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Spacer />
        <Key keyId="key_delete" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
      </div>
      
      {/* Spacer between function row and main keyboard */}
      <div className="h-3" />

      {/* Number Row */}
      <div className="flex items-center gap-2">
        <Key keyId="key_1" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_2" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_3" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_4" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_5" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_6" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_7" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_8" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_9" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_0" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_backspace" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
      </div>

      {/* QWERTY Row */}
      <div className="flex items-center gap-2">
        <Key keyId="key_tab" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_q" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_w" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_e" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_r" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_t" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_y" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_u" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_i" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_o" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_p" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
      </div>

      {/* Home Row */}
      <div className="flex items-center gap-2">
        <Key keyId="key_a" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_s" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_d" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_f" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_g" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_h" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_j" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_k" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_l" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_enter" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
      </div>

      {/* Bottom Letter Row */}
      <div className="flex items-center gap-2">
        <Key keyId="key_shift" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_z" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_x" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_c" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_v" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_b" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_n" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_m" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        {/* Arrow keys cluster */}
        <Spacer size={3} />
        <Key keyId="key_up" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
      </div>

      {/* Space Row */}
      <div className="flex items-center gap-2">
        <Key keyId="key_control" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_alt" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_space" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_alt" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_control" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        {/* Arrow keys bottom row */}
        <Spacer />
        <Key keyId="key_left" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_down" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
        <Key keyId="key_right" selected={selectedInput} onSelect={onSelect} accentColor={accentColor} />
      </div>
      
      {/* Legend */}
      <div 
        className="mt-6 text-sm text-[#A1A1AA] text-center"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Click a key to select it
      </div>
    </div>
  );
}
