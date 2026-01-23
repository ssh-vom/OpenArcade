#include "battery.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_err.h"
#include "esp_log.h"

adc_oneshot_unit_handle_t configure_adc_handle() {

  adc_oneshot_unit_handle_t adc1_handle;
  adc_oneshot_unit_init_cfg_t init_config1 = {
      .unit_id = ADC_UNIT_1,
      .ulp_mode = ADC_ULP_MODE_DISABLE,
  };
  ESP_ERROR_CHECK(adc_oneshot_new_unit(&init_config1, &adc1_handle));
  adc_oneshot_chan_cfg_t config = {
      .bitwidth = ADC_BITWIDTH_DEFAULT,
      .atten = ADC_ATTEN_DB_12,
  };
  ESP_ERROR_CHECK(
      adc_oneshot_config_channel(adc1_handle, BATTERY_ADC_CHANNEL, &config));
  ;
  return adc1_handle;
};

uint8_t get_battery_value(adc_oneshot_unit_handle_t *adc_handle) {

  int adc_voltage;
  adc_oneshot_read(*adc_handle, BATTERY_ADC_CHANNEL, &adc_voltage);

  float vout = ((adc_voltage * ADC_VREF) / DMAX) * VOLTAGE_DIVIDER_RATIO;

  int battery_percent = ((vout - BATTERY_PACK_EMPTY_VOLT) /
                         (BATTERY_PACK_MAX_VOLT - BATTERY_PACK_EMPTY_VOLT)) *
                        100;

  int battery_level_displayed = (battery_percent / BATTERY_DISPLAY_INCREMENTS) *
                                BATTERY_DISPLAY_INCREMENTS;

  // ESP_LOGI("BATTERY", "adc=%d vout=%.3f max=%.2f empty=%.2f bp=%d",
  // adc_voltage,
  //          vout, (double)BATTERY_PACK_MAX_VOLT,
  //          (double)BATTERY_PACK_EMPTY_VOLT, battery_level_displayed);
  return battery_level_displayed;
};
