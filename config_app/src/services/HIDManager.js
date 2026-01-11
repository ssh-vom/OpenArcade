// Xbox/Generic Gamepad Button Mappings for HID Configuration

export const HID_INPUT_TYPES = {
  GAMEPAD: 'gamepad',
  KEYBOARD: 'keyboard', 
  ANALOG: 'analog'
};

// Xbox gamepad button mappings with user-friendly labels
export const GAMEPAD_INPUTS = {
  // Face buttons
  xb_button_a: { label: 'A Button', category: 'Face' },
  xb_button_b: { label: 'B Button', category: 'Face' },
  xb_button_x: { label: 'X Button', category: 'Face' },
  xb_button_y: { label: 'Y Button', category: 'Face' },
  
  // D-pad
  xb_dpad_up: { label: 'D-Pad Up', category: 'D-Pad' },
  xb_dpad_down: { label: 'D-Pad Down', category: 'D-Pad' },
  xb_dpad_left: { label: 'D-Pad Left', category: 'D-Pad' },
  xb_dpad_right: { label: 'D-Pad Right', category: 'D-Pad' },
  
  // Shoulder buttons
  xb_left_bumper: { label: 'Left Bumper (LB)', category: 'Shoulder' },
  xb_right_bumper: { label: 'Right Bumper (RB)', category: 'Shoulder' },
  
  // Triggers (analog)
  xb_left_trigger: { label: 'Left Trigger (LT)', category: 'Shoulder', isAnalog: true },
  xb_right_trigger: { label: 'Right Trigger (RT)', category: 'Shoulder', isAnalog: true },
  
  // Stick buttons
  xb_left_stick_button: { label: 'Left Stick Click', category: 'Sticks' },
  xb_right_stick_button: { label: 'Right Stick Click', category: 'Sticks' },
  
  // Analog sticks
  xb_left_stick_x: { label: 'Left Stick X-Axis', category: 'Sticks', isAnalog: true },
  xb_left_stick_y: { label: 'Left Stick Y-Axis', category: 'Sticks', isAnalog: true },
  xb_right_stick_x: { label: 'Right Stick X-Axis', category: 'Sticks', isAnalog: true },
  xb_right_stick_y: { label: 'Right Stick Y-Axis', category: 'Sticks', isAnalog: true },
  
  // Menu buttons
  xb_menu: { label: 'Menu (Start)', category: 'Menu' },
  xb_view: { label: 'View (Back)', category: 'Menu' },
  xb_home: { label: 'Home/Xbox', category: 'Menu' }
};

// Common keyboard key mappings
export const KEYBOARD_INPUTS = {
  // Letters
  key_a: { label: 'A', category: 'Letters' },
  key_b: { label: 'B', category: 'Letters' },
  key_c: { label: 'C', category: 'Letters' },
  key_d: { label: 'D', category: 'Letters' },
  key_e: { label: 'E', category: 'Letters' },
  key_f: { label: 'F', category: 'Letters' },
  key_g: { label: 'G', category: 'Letters' },
  key_h: { label: 'H', category: 'Letters' },
  key_i: { label: 'I', category: 'Letters' },
  key_j: { label: 'J', category: 'Letters' },
  key_k: { label: 'K', category: 'Letters' },
  key_l: { label: 'L', category: 'Letters' },
  key_m: { label: 'M', category: 'Letters' },
  key_n: { label: 'N', category: 'Letters' },
  key_o: { label: 'O', category: 'Letters' },
  key_p: { label: 'P', category: 'Letters' },
  key_q: { label: 'Q', category: 'Letters' },
  key_r: { label: 'R', category: 'Letters' },
  key_s: { label: 'S', category: 'Letters' },
  key_t: { label: 'T', category: 'Letters' },
  key_u: { label: 'U', category: 'Letters' },
  key_v: { label: 'V', category: 'Letters' },
  key_w: { label: 'W', category: 'Letters' },
  key_x: { label: 'X', category: 'Letters' },
  key_y: { label: 'Y', category: 'Letters' },
  key_z: { label: 'Z', category: 'Letters' },
  
  // Numbers
  key_0: { label: '0', category: 'Numbers' },
  key_1: { label: '1', category: 'Numbers' },
  key_2: { label: '2', category: 'Numbers' },
  key_3: { label: '3', category: 'Numbers' },
  key_4: { label: '4', category: 'Numbers' },
  key_5: { label: '5', category: 'Numbers' },
  key_6: { label: '6', category: 'Numbers' },
  key_7: { label: '7', category: 'Numbers' },
  key_8: { label: '8', category: 'Numbers' },
  key_9: { label: '9', category: 'Numbers' },
  
  // Special keys
  key_space: { label: 'Space', category: 'Special' },
  key_enter: { label: 'Enter', category: 'Special' },
  key_escape: { label: 'Escape', category: 'Special' },
  key_tab: { label: 'Tab', category: 'Special' },
  key_backspace: { label: 'Backspace', category: 'Special' },
  key_delete: { label: 'Delete', category: 'Special' },
  key_shift: { label: 'Shift', category: 'Special' },
  key_control: { label: 'Control', category: 'Special' },
  key_alt: { label: 'Alt', category: 'Special' },
  
  // Arrow keys
  key_up: { label: 'Up Arrow', category: 'Navigation' },
  key_down: { label: 'Down Arrow', category: 'Navigation' },
  key_left: { label: 'Left Arrow', category: 'Navigation' },
  key_right: { label: 'Right Arrow', category: 'Navigation' },
  
  // Function keys
  key_f1: { label: 'F1', category: 'Function' },
  key_f2: { label: 'F2', category: 'Function' },
  key_f3: { label: 'F3', category: 'Function' },
  key_f4: { label: 'F4', category: 'Function' },
  key_f5: { label: 'F5', category: 'Function' },
  key_f6: { label: 'F6', category: 'Function' },
  key_f7: { label: 'F7', category: 'Function' },
  key_f8: { label: 'F8', category: 'Function' },
  key_f9: { label: 'F9', category: 'Function' },
  key_f10: { label: 'F10', category: 'Function' },
  key_f11: { label: 'F11', category: 'Function' },
  key_f12: { label: 'F12', category: 'Function' }
};

// Analog input configurations
export const ANALOG_INPUTS = {
  left_stick_x: { label: 'Left Stick X-Axis', type: 'bidirectional' },
  left_stick_y: { label: 'Left Stick Y-Axis', type: 'bidirectional' },
  right_stick_x: { label: 'Right Stick X-Axis', type: 'bidirectional' },
  right_stick_y: { label: 'Right Stick Y-Axis', type: 'bidirectional' },
  left_trigger: { label: 'Left Trigger', type: 'unidirectional' },
  right_trigger: { label: 'Right Trigger', type: 'unidirectional' }
};

// Helper functions
export const getInputOptions = (type) => {
  switch (type) {
    case HID_INPUT_TYPES.GAMEPAD:
      return Object.entries(GAMEPAD_INPUTS).map(([value, config]) => ({
        value,
        label: config.label,
        category: config.category,
        isAnalog: config.isAnalog || false
      }));
    case HID_INPUT_TYPES.KEYBOARD:
      return Object.entries(KEYBOARD_INPUTS).map(([value, config]) => ({
        value,
        label: config.label,
        category: config.category,
        isAnalog: false
      }));
    case HID_INPUT_TYPES.ANALOG:
      return Object.entries(ANALOG_INPUTS).map(([value, config]) => ({
        value,
        label: config.label,
        type: config.type
      }));
    default:
      return [];
  }
};

export const getInputLabel = (type, input) => {
  switch (type) {
    case HID_INPUT_TYPES.GAMEPAD:
      return GAMEPAD_INPUTS[input]?.label || input;
    case HID_INPUT_TYPES.KEYBOARD:
      return KEYBOARD_INPUTS[input]?.label || input;
    case HID_INPUT_TYPES.ANALOG:
      return ANALOG_INPUTS[input]?.label || input;
    default:
      return input;
  }
};