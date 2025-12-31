#ifndef DEBOUNCE_H
#define DEBOUNCE_H

#include <stdbool.h>
#include <stdint.h>

typedef enum {
  BTN_STATE_RELEASED,
  BTN_STATE_PRESS_DETECTED,
  BTN_STATE_PRESSED,
  BTN_STATE_RELEASE_DETECTED
} button_state_t;

typedef enum {
  BUTTON_EVENT_NONE,
  BUTTON_EVENT_PRESSED,
  BUTTON_EVENT_RELEASED,
  BUTTON_EVENT_HELD
} button_event_t;

typedef struct {
  button_state_t state;

  bool stable_pressed;
  bool hold_fired;

  uint32_t debounce_ms;
  uint32_t hold_ms;

  uint32_t last_transition_time;
  uint32_t pressed_time;
} debounce_button_t;

void debounce_init(debounce_button_t *btn, uint32_t debounce_ms,
                   uint32_t hold_ms);

button_event_t debounce_update(debounce_button_t *btn, bool raw_pressed,
                               uint32_t now_ms);

#endif // DEBOUNCE_H
