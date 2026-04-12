export const EDITING_MODES = {
  KEYBOARD: 'keyboard',
  GAMEPAD_PC: 'gamepad_pc',
  GAMEPAD_SWITCH: 'gamepad_switch_hori',
} as const;

export type EditingMode = (typeof EDITING_MODES)[keyof typeof EDITING_MODES];

export const EDITING_MODE_LABELS: Record<EditingMode, string> = {
  keyboard: 'Keyboard',
  gamepad_pc: 'Gamepad (PC)',
  gamepad_switch_hori: 'Gamepad (Switch Hori)',
};
