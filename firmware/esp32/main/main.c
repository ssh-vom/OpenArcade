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

#define BUTTON1_GPIO 16
#define DEBOUNCE_US 3000
uint64_t BUTTONS[BUTTON1_GPIO];

/* Library function declarations */
void ble_store_config_init(void);

/* Private function declarations */
static void on_stack_reset(int reason);
static void on_stack_sync(void);
static void nimble_host_config_init(void);
static void nimble_host_task(void *param);

int get_button_state(int GPIO);

bool wasPressed = false;
bool debounced_state = true;
bool logical_pressed = 0;
int64_t last_change_time = 0;
int get_button_state(int GPIO) {

  bool raw = gpio_get_level(GPIO);

  int64_t now = esp_timer_get_time();

  if (raw != debounced_state && (now - last_change_time) > DEBOUNCE_US) {
    debounced_state = raw;
    last_change_time = now;

    if (debounced_state == 0 && !logical_pressed) {
      logical_pressed = 1;
    }

    else if (debounced_state == 1 && logical_pressed) {
      logical_pressed = 0;
    }
  }

  return logical_pressed;
}

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

    ESP_LOGI(TAG, "button state%d", get_button_state(BUTTON1_GPIO));
    /* Sleep */
    vTaskDelay(HEART_RATE_TASK_PERIOD);
  }

  /* Clean up at exit */
  vTaskDelete(NULL);
}

static void configure_gpio(void) {

  for (int i = 0; i < sizeof(BUTTONS) / sizeof(uint64_t); ++i) {
    gpio_config_t io_conf = {.pin_bit_mask = (1ULL << BUTTONS[i]),
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
