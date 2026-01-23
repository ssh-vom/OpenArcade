#ifndef DISPLAY_H
#define DISPLAY_H

#include <esp_err.h>
#include <stdbool.h>

typedef enum {
  DISPLAY_STATE_BOOT,
  DISPLAY_STATE_IDLE,
  DISPLAY_STATE_PAIRING,
  DISPLAY_STATE_CONNECTED,
  DISPLAY_STATE_CONFIG,
  DISPLAY_STATE_NOTIFY,
  DISPLAY_STATE_ERROR,
} display_state_t;

esp_err_t display_init(void);
void display_set_state(display_state_t state);
void display_refresh(void);
void display_set_battery(uint8_t percent);

#endif // DISPLAY_H
