#ifndef CONTROLLER_INPUT_H
#define CONTROLLER_INPUT_H

#include <stdbool.h>
#include <stdint.h>

#define MAX_BUTTONS 16
#define BUTTON1_GPIO 15
#define BUTTON2_GPIO 4
#define BUTTON3_GPIO 16
#define BUTTON4_GPIO 17
#define BUTTON5_GPIO 5
#define BUTTON6_GPIO 18
#define BUTTON7_GPIO 19
#define SCREEN_SCL 21
#define SCREEN_SDA 22
#define BUTTON8_GPIO 23
#define JOYSTICK_R 32
#define JOYSTICK_U 33
#define JOYSTICK_L 25
#define JOYSTICK_D 26
#define BUTTON_SEL 27
#define BUTTON_START 14
#define BUTTON_PAIR 12
#define BATTERY_LIFE 13
#define DEBOUNCE_US 3000

#define RAW(pin) ((pin < 32) ? ((in0 >> pin) & 1) : ((in1 >> (pin - 32)) & 1))
#define PACK(bitpos, pin) (RAW(pin) << bitpos)

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

typedef struct {
  // Face buttons
  uint32_t b1 : 1;
  uint32_t b2 : 1;
  uint32_t b3 : 1;
  uint32_t b4 : 1;
  uint32_t b5 : 1;
  uint32_t b6 : 1;
  uint32_t b7 : 1;
  uint32_t b8 : 1;

  // Joystick
  uint32_t joy_l : 1;
  uint32_t joy_r : 1;
  uint32_t joy_u : 1;
  uint32_t joy_d : 1;

  // System/menu
  uint32_t select : 1;
  uint32_t start : 1;
  uint32_t pair : 1;

  // I2C signals (optional)
  uint32_t scl : 1;
  uint32_t sda : 1;

  // Battery
  uint32_t battery : 1;

  uint32_t : 13; // unused / padding

} controller_state_t;

// Function declarations for debounce module
void debounce_init(void);
bool get_debounced_button_state(int gpio_pin);
void update_all_debounced_states(void);
controller_state_t read_all_buttons_debounced(void);

#endif // CONTROLLER_INPUT_H
