export const VIEW_MODES = {
  TWO_D: '2d',
  THREE_D: '3d',
} as const;

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES];
