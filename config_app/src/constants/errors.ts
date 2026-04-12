export const ERROR_NAMES = {
  PORT_IN_USE: 'PortInUseError',
  USER_CANCELLED: 'UserCancelledError',
  INVALID_STATE: 'InvalidStateError',
} as const;

export type ErrorName = (typeof ERROR_NAMES)[keyof typeof ERROR_NAMES];
