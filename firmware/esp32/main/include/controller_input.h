#ifndef CONTROLLER_INPUT_H
#define CONTROLLER_INPUT_H
#include "debounce.h"

#include <stdbool.h>
#include <stdint.h>
#include <pins.h>

#define MAX_BUTTONS 18

/* ================================
 * Controller State (BLE payload)
 * ================================ */
typedef union {
  struct {
    uint32_t b1 : 1;
    uint32_t b2 : 1;
    uint32_t b3 : 1;
    uint32_t b4 : 1;
    uint32_t b5 : 1;
    uint32_t b6 : 1;
    uint32_t b7 : 1;
    uint32_t b8 : 1;

    uint32_t joy_l : 1;
    uint32_t joy_r : 1;
    uint32_t joy_u : 1;
    uint32_t joy_d : 1;

    uint32_t select : 1;
    uint32_t start : 1;
    uint32_t pair : 1;

    uint32_t scl : 1;
    uint32_t sda : 1;
    uint32_t battery : 1;

    uint32_t : 14;
  };
  uint32_t raw;
} controller_state_t;

typedef struct {
  uint8_t gpio;
  bool active_low;
  debounce_button_t debounce;
} controller_button_t;

typedef struct {
  controller_button_t buttons[MAX_BUTTONS];
  uint8_t count;
  controller_state_t state;
} controller_input_t;

/* API */
void controller_input_init(controller_input_t *ci);

bool controller_input_add_button(controller_input_t *ci, uint8_t gpio,
                                 bool active_low, uint32_t debounce_ms,
                                 uint32_t hold_ms);

void controller_input_update(controller_input_t *ci, uint32_t now_ms);

controller_state_t controller_input_get_state(controller_input_t *ci);

#endif // CONTROLLER_INPUT_H
