#ifndef BATTERY_H
#define BATTERY_H

#include "esp_adc/adc_oneshot.h"
#include <esp_err.h>
#include <stdbool.h>
#define BATTERY_ADC_CHANNEL ADC_CHANNEL_6 // This is the ADC channel for GPIO34

#define BATTERY_PACK_MAX_VOLT 6.6
#define BATTERY_PACK_EMPTY_VOLT 4.4

#define BATTERY_DISPLAY_INCREMENTS                                             \
  5 // determines how often we want to show battery drop (so 4 -> 100/4 = every
    // 25%)

#define R1 100000
#define R2 100000
#define VOLTAGE_DIVIDER_RATIO ((R1 + R2) / R1)

#define DMAX 4095 // Defines the absolute max of the range 2^12 - 1
#define ADC_VREF 3.3

uint8_t get_battery_value(adc_oneshot_unit_handle_t *adc_handle);
adc_oneshot_unit_handle_t configure_adc_handle();

#endif
