#include "display.h"
#include "driver/i2c_master.h"
#include "esp_log.h"
#include "ssd1306.h"
#include "pins.h"
#include "esp_adc/adc_oneshot.h"

#define TAG "display"

static i2c_master_bus_handle_t i2c_bus;
static ssd1306_handle_t screen;

/* Track current state to avoid redraw spam */
static display_state_t current_state = -1;

/* Optional dynamic info */
static uint8_t battery_pct = 0;

/* ---------- Internal helpers ---------- */

static void display_clear(void) {
  if (!screen)
    return;
  ssd1306_clear_display(screen, false);
}

static void display_draw_header(const char *title) {
  if (!screen)
    return;
  ssd1306_display_text(screen, 0, title, false);
}

static void display_draw_battery(void) {
  if (!screen)
    return;
  char buf[16];
  snprintf(buf, sizeof(buf), "BAT: [####-]");
  ssd1306_display_text(screen, 7, buf, false);
}

esp_err_t display_init(void) {
  /* Create I2C master bus (ESP-IDF v5) */
  i2c_master_bus_config_t bus_cfg = {
      .i2c_port = I2C_NUM_0,
      .sda_io_num = SCREEN_SDA,
      .scl_io_num = SCREEN_SCL,
      .clk_source = I2C_CLK_SRC_DEFAULT,
      .glitch_ignore_cnt = 7,
      .flags.enable_internal_pullup = true,
  };

  ESP_ERROR_CHECK(i2c_new_master_bus(&bus_cfg, &i2c_bus));

  /* SSD1306 config */
  ssd1306_config_t cfg = I2C_SSD1306_128x64_CONFIG_DEFAULT;

  esp_err_t err = ssd1306_init(i2c_bus, &cfg, &screen);
  if (err != ESP_OK) {
    ESP_LOGW(TAG, "SSD1306 not found, running headless");
    screen = NULL;
    return ESP_OK;
  }

  display_clear();
  display_set_state(DISPLAY_STATE_BOOT);

  ESP_LOGI(TAG, "Display initialized");
  return ESP_OK;
}

void display_set_state(display_state_t state) {
  if (!screen)
    return;

  if (state == current_state) {
    return; // no-op
  }

  current_state = state;
  display_clear();

  switch (state) {

  case DISPLAY_STATE_BOOT:
    display_draw_header("OpenArcade");
    ssd1306_display_text(screen, 2, "Booting...", false);
    break;

  case DISPLAY_STATE_IDLE:
    display_draw_header("Idle");
    ssd1306_display_text(screen, 2, "PAIR", false);
    break;

  case DISPLAY_STATE_PAIRING:
    display_draw_header("Pairing");
    ssd1306_display_text(screen, 2, "Searching...", false);
    break;

  case DISPLAY_STATE_CONNECTED:
    display_draw_header("Connected");
    ssd1306_display_text(screen, 2, "Ready", false);
    break;

  case DISPLAY_STATE_CONFIG:
    display_draw_header("Config");
    ssd1306_display_text(screen, 2, "Mapping Inputs", false);
    break;

  case DISPLAY_STATE_NOTIFY:
    display_draw_header("Active");
    ssd1306_display_text(screen, 2, "Sending Input", false);
    break;

  case DISPLAY_STATE_ERROR:
    display_draw_header("ERROR");
    ssd1306_display_text(screen, 2, "Reconnect...", false);
    break;
  }

  display_draw_battery();
}

void display_set_battery(uint8_t percent) {
  battery_pct = percent;

  if (screen) {
    display_draw_battery();
  }
}


uint8_t get_battery_value (uint8_t gpio) {

  #define BATTERY_ADC_CHANNEL ADC_CHANNEL_6 //This is the ADC channel for GPIO34

  #define BATTERY_PACK_MAX_VOLT 6
  #define BATTERY_PACK_EMPTY_VOLT 4.4

  #define BATTERY_DISPLAY_INCREMENTS 4 //determines how often we want to show battery drop (so 4 -> 100/4 = every 25%)

  #define R1 100000
  #define R2 100000
  #define VOLTAGE_DIVIDER_RATIO ((R1+R2)/R1)
  
  #define DMAX 4096
  #define ADC_VREF 3.3

  //create adc unit handle for ADC1
  adc_oneshot_unit_handle_t adc1_handle;
  adc_oneshot_unit_init_cfg_t init_config1 = {
      .unit_id = ADC_UNIT_1,
      .ulp_mode = ADC_ULP_MODE_DISABLE,
  };
  ESP_ERROR_CHECK(adc_oneshot_new_unit(&init_config1, &adc1_handle));

  // configure adc channel
  adc_oneshot_chan_cfg_t config = {
    .bitwidth = ADC_BITWIDTH_DEFAULT,
    .atten = ADC_ATTEN_DB_12,
  };
  ESP_ERROR_CHECK(adc_oneshot_config_channel(adc1_handle, BATTERY_ADC_CHANNEL, &config));
;

  int adc_voltage; 
  adc_oneshot_read(adc1_handle, BATTERY_ADC_CHANNEL, &adc_voltage);
  float vout = (adc_voltage*ADC_VREF) / DMAX;

  int battery_percent = (vout - BATTERY_PACK_EMPTY_VOLT) / (BATTERY_PACK_MAX_VOLT - BATTERY_PACK_EMPTY_VOLT);

  int battery_level_displayed = (battery_percent / BATTERY_DISPLAY_INCREMENTS) * BATTERY_DISPLAY_INCREMENTS;

  return battery_level_displayed;

}
