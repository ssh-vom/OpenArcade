#include "controller_input.h"
#include "debounce.h"
#include "driver/gpio.h"
#include <string.h>

void controller_input_init(controller_input_t *ci) {
  memset(ci, 0, sizeof(*ci));
}

bool controller_input_add_button(controller_input_t *ci, uint8_t gpio,
                                 bool active_low, uint32_t debounce_ms,
                                 uint32_t hold_ms) {
  if (ci->count >= MAX_BUTTONS) {
    return false;
  }

  gpio_config_t cfg = {
      .pin_bit_mask = 1ULL << gpio,
      .mode = GPIO_MODE_INPUT,
      .pull_up_en = active_low ? GPIO_PULLUP_ENABLE : GPIO_PULLUP_DISABLE,
      .pull_down_en = active_low ? GPIO_PULLDOWN_DISABLE : GPIO_PULLDOWN_ENABLE,
      .intr_type = GPIO_INTR_DISABLE,
  };
  gpio_config(&cfg);

  controller_button_t *b = &ci->buttons[ci->count++];
  b->gpio = gpio;
  b->active_low = active_low;
  debounce_init(&b->debounce, debounce_ms, hold_ms);

  return true;
}

void controller_input_update(controller_input_t *ci, uint32_t now_ms) {
  ci->state.raw = 0;

  for (uint8_t i = 0; i < ci->count; i++) {
    controller_button_t *b = &ci->buttons[i];

    bool raw = gpio_get_level(b->gpio);
    bool pressed = b->active_low ? !raw : raw;

    debounce_update(&b->debounce, pressed, now_ms);

    if (b->debounce.stable_pressed) {
      ci->state.raw |= (1U << i);
    }
  }
}

controller_state_t controller_input_get_state(controller_input_t *ci) {
  return ci->state;
}
