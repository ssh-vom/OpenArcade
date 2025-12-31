#include "debounce.h"

void debounce_init(debounce_button_t *btn, uint32_t debounce_ms,
                   uint32_t hold_ms) {
  btn->state = BTN_STATE_RELEASED;
  btn->stable_pressed = false;
  btn->hold_fired = false;

  btn->debounce_ms = debounce_ms;
  btn->hold_ms = hold_ms;

  btn->last_transition_time = 0;
  btn->pressed_time = 0;
}

button_event_t debounce_update(debounce_button_t *btn, bool raw_pressed,
                               uint32_t now_ms) {
  switch (btn->state) {

  case BTN_STATE_RELEASED:
    if (raw_pressed) {
      btn->state = BTN_STATE_PRESS_DETECTED;
      btn->last_transition_time = now_ms;
    }
    break;

  case BTN_STATE_PRESS_DETECTED:
    if (!raw_pressed) {
      btn->state = BTN_STATE_RELEASED;
    } else if (now_ms - btn->last_transition_time >= btn->debounce_ms) {
      btn->state = BTN_STATE_PRESSED;
      btn->stable_pressed = true;
      btn->hold_fired = false;
      btn->pressed_time = now_ms;
      return BUTTON_EVENT_PRESSED;
    }
    break;

  case BTN_STATE_PRESSED:
    if (!raw_pressed) {
      btn->state = BTN_STATE_RELEASE_DETECTED;
      btn->last_transition_time = now_ms;
    } else if (!btn->hold_fired && btn->hold_ms > 0 &&
               now_ms - btn->pressed_time >= btn->hold_ms) {
      btn->hold_fired = true;
      return BUTTON_EVENT_HELD;
    }
    break;

  case BTN_STATE_RELEASE_DETECTED:
    if (raw_pressed) {
      btn->state = BTN_STATE_PRESSED;
    } else if (now_ms - btn->last_transition_time >= btn->debounce_ms) {
      btn->state = BTN_STATE_RELEASED;
      btn->stable_pressed = false;
      return BUTTON_EVENT_RELEASED;
    }
    break;
  }

  return BUTTON_EVENT_NONE;
}
