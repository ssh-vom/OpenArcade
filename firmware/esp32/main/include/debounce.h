#ifndef DEBOUNCE_H
#define DEBOUNCE_H

typedef enum {

  BTN_STATE_RELEASED, // Button is released

  BTN_STATE_PRESS_DETECTED, // Initial Press

  BTN_STATE_PRESSED, // (stable)

  BTN_STATE_RELEASE_DETECTED // (unstable)

} button_state_t;

typedef enum {

  BUTTON_EVENT_NONE,
  BUTTON_EVENT_PRESSED,
  BUTTON_EVENT_RELEASED,
  BUTTON_EVENT_HELD

} button_event_t;

#endif // DEBOUNCE_H
