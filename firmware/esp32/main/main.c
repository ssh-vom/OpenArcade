/*
 * SPDX-FileCopyrightText: 2024 Espressif Systems (Shanghai) CO LTD
 *
 * SPDX-License-Identifier: Unlicense OR CC0-1.0
 */
/* Includes */
#include "common.h"
#include "driver/gpio.h"
#include "gap.h"
#include "gatt_svc.h"
#include "heart_rate.h"
#include "led.h"
#include "soc/gpio_reg.h"

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

static inline uint32_t read_all_buttons_packed() {

  uint32_t in0 = REG_READ(GPIO_IN_REG);
  uint32_t in1 = REG_READ(GPIO_IN1_REG);

#define RAW(pin) ((pin < 32) ? ((in0 >> pin) & 1) : ((in1 >> (pin - 32)) & 1))
#define PACK(bitpos, pin) (RAW(pin) << bitpos)
  uint32_t out = 0;
  // Face buttons
  out |= PACK(0, BUTTON1_GPIO);
  out |= PACK(1, BUTTON2_GPIO);
  out |= PACK(2, BUTTON3_GPIO);
  out |= PACK(3, BUTTON4_GPIO);
  out |= PACK(4, BUTTON5_GPIO);
  out |= PACK(5, BUTTON6_GPIO);
  out |= PACK(6, BUTTON7_GPIO);
  out |= PACK(7, BUTTON8_GPIO);

  // Joystick
  out |= PACK(8, JOYSTICK_L);
  out |= PACK(9, JOYSTICK_R);
  out |= PACK(10, JOYSTICK_U);
  out |= PACK(11, JOYSTICK_D);

  // System/menu
  out |= PACK(12, BUTTON_SEL);
  out |= PACK(13, BUTTON_START);
  out |= PACK(14, BUTTON_PAIR);

  // Extra
  // out |= PACK(15, 35);

  // I2C pins
  out |= PACK(15, SCREEN_SCL);
  out |= PACK(16, SCREEN_SDA);

  // Battery
  out |= PACK(17, BATTERY_LIFE);

  return out;
}

static inline controller_state_t read_all_buttons() {
  uint32_t packed = read_all_buttons_packed();
  return *(controller_state_t *)&packed;
}
static const uint8_t INPUT_PINS[] = {
    BUTTON1_GPIO, BUTTON2_GPIO, BUTTON3_GPIO, BUTTON4_GPIO, BUTTON5_GPIO,
    BUTTON6_GPIO, BUTTON7_GPIO, BUTTON8_GPIO, JOYSTICK_L,   JOYSTICK_R,
    JOYSTICK_U,   JOYSTICK_D,   BUTTON_SEL,   BUTTON_START, BUTTON_PAIR,
    SCREEN_SCL,   SCREEN_SDA,   BATTERY_LIFE};
/* Library function declarations */
void ble_store_config_init(void);

/* Private function declarations */
static void on_stack_reset(int reason);
static void on_stack_sync(void);
static void nimble_host_config_init(void);
static void nimble_host_task(void *param);

int get_button_state(int GPIO);

// bool wasPressed = false;
// bool debounced_state = true;
// bool logical_pressed = 0;
// int64_t last_change_time = 0;
// // int get_button_state(int GPIO) {
// //
// //   bool raw = gpio_get_level(GPIO);
// //
// //   int64_t now = esp_timer_get_time();
// //
// //   if (raw != debounced_state && (now - last_change_time) > DEBOUNCE_US) {
// //     debounced_state = raw;
// //     last_change_time = now;
// //
// //     if (debounced_state == 0 && !logical_pressed) {
// //       logical_pressed = 1;
// //     }
// //
// //     else if (debounced_state == 1 && logical_pressed) {
// //       logical_pressed = 0;
// //     }
// //   }
// //
//   return logical_pressed;
// }

// pull down reads 0 when not pressed

/* Private functions */
/*
 *  Stack event callback functions
 *      - on_stack_reset is called when host resets BLE stack due to errors
 *      - on_stack_sync is called when host has synced with controller
 */
static void on_stack_reset(int reason) {
  /* On reset, print reset reason to console */
  ESP_LOGI(TAG, "nimble stack reset, reset reason: %d", reason);
}

static void on_stack_sync(void) {
  /* On stack sync, do advertising initialization */
  adv_init();
}

static void nimble_host_config_init(void) {
  /* Set host callbacks */
  ble_hs_cfg.reset_cb = on_stack_reset;
  ble_hs_cfg.sync_cb = on_stack_sync;
  ble_hs_cfg.gatts_register_cb = gatt_svr_register_cb;
  ble_hs_cfg.store_status_cb = ble_store_util_status_rr;

  /* Store host configuration */
  ble_store_config_init();
}

static void nimble_host_task(void *param) {
  /* Task entry log */
  ESP_LOGI(TAG, "nimble host task has been started!");

  /* This function won't return until nimble_port_stop() is executed */
  nimble_port_run();

  /* Clean up at exit */
  vTaskDelete(NULL);
}

static void heart_rate_task(void *param) {
  /* Task entry log */
  ESP_LOGI(TAG, "heart rate task has been started!");

  /* Loop forever */
  while (1) {
    /* Update heart rate value every 1 second */
    // update_heart_rate();
    // ESP_LOGI(TAG, "heart rate updated to %d", get_heart_rate());

    /* Send heart rate indication if enabled */
    // send_heart_rate_notification();
    send_button_state_notification();
    controller_state_t st = read_all_buttons();

    ESP_LOGI("BTN",
             "B:%d%d%d%d %d%d%d%d  J:%d%d%d%d  SYS:%d %d %d  I2C:%d %d  BAT:%d",
             st.b1, st.b2, st.b3, st.b4, st.b5, st.b6, st.b7, st.b8, st.joy_l,
             st.joy_r, st.joy_u, st.joy_d, st.select, st.start, st.pair, st.scl,
             st.sda, st.battery);

    vTaskDelay(HEART_RATE_TASK_PERIOD);
  }

  /* Clean up at exit */
  vTaskDelete(NULL);
}

static void configure_gpio(void) {

  for (int i = 0; i < sizeof(INPUT_PINS) / sizeof(INPUT_PINS[0]); ++i) {
    gpio_config_t io_conf = {.pin_bit_mask = (1ULL << INPUT_PINS[i]),
                             .mode = GPIO_MODE_INPUT,
                             .pull_up_en = GPIO_PULLUP_ENABLE,
                             .pull_down_en = GPIO_PULLDOWN_DISABLE,
                             .intr_type = GPIO_INTR_DISABLE};

    gpio_config(&io_conf);
  }
}

void app_main(void) {
  /* Local variables */
  int rc;
  esp_err_t ret;

  /* LED initialization */
  // led_init();
  configure_gpio();

  /*
   * NVS flash initialization
   * Dependency of BLE stack to store configurations
   */
  ret = nvs_flash_init();
  if (ret == ESP_ERR_NVS_NO_FREE_PAGES ||
      ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
    ESP_ERROR_CHECK(nvs_flash_erase());
    ret = nvs_flash_init();
  }
  if (ret != ESP_OK) {
    ESP_LOGE(TAG, "failed to initialize nvs flash, error code: %d ", ret);
    return;
  }

  /* NimBLE stack initialization */
  ret = nimble_port_init();
  if (ret != ESP_OK) {
    ESP_LOGE(TAG, "failed to initialize nimble stack, error code: %d ", ret);
    return;
  }

  /* GAP service initialization */
  rc = gap_init();
  if (rc != 0) {
    ESP_LOGE(TAG, "failed to initialize GAP service, error code: %d", rc);
    return;
  }

  /* GATT server initialization */
  rc = gatt_svc_init();
  if (rc != 0) {
    ESP_LOGE(TAG, "failed to initialize GATT server, error code: %d", rc);
    return;
  }

  /* NimBLE host configuration initialization */
  nimble_host_config_init();

  /* Start NimBLE host task thread and return */
  xTaskCreate(nimble_host_task, "NimBLE Host", 4 * 1024, NULL, 5, NULL);
  xTaskCreate(heart_rate_task, "Heart Rate", 4 * 1024, NULL, 5, NULL);
  return;
}
