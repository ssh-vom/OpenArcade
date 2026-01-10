/* SPDX-FileCopyrightText: 2024 Espressif Systems (Shanghai) CO LTD
 *
 * SPDX-License-Identifier: Unlicense OR CC0-1.0
 */
/* Includes */
#include "common.h"
#include "controller_input.h"
#include "display.h"
#include "gap.h"
#include "gatt_svc.h"

/* Library function declarations */
void ble_store_config_init(void);

/* Private function declarations */
static void on_stack_reset(int reason);
static void on_stack_sync(void);
static void nimble_host_config_init(void);
static void nimble_host_task(void *param);

static volatile bool ble_ready = false;
int get_button_state(int GPIO);
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
  ESP_LOGI(TAG, "Stack synced, ready for connections");
  ble_ready = true;
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

static const controller_button_config_t controller_buttons[] = {
    {BUTTON1_GPIO, true, 20, 800}, {BUTTON2_GPIO, true, 20, 800},
    {BUTTON3_GPIO, true, 20, 800}, {BUTTON4_GPIO, true, 20, 800},
    {BUTTON5_GPIO, true, 20, 800}, {BUTTON6_GPIO, true, 20, 800},
    {BUTTON7_GPIO, true, 20, 800}, {BUTTON8_GPIO, true, 20, 800},
    {JOYSTICK_L, true, 15, 0},     {JOYSTICK_R, true, 15, 0},
    {JOYSTICK_U, true, 15, 0},     {JOYSTICK_D, true, 15, 0},
    {BUTTON_SEL, true, 30, 1500},  {BUTTON_START, true, 30, 1500},
    {BUTTON_PAIR, true, 50, 3000},
};

static controller_input_t input;

static void controller_task(void *param) {
  ESP_LOGI(TAG, "Controller Task has been started!");

  while (1) {
    uint32_t now_ms = esp_timer_get_time() / 1000;

    controller_input_update(&input, now_ms);
    controller_state_t st = controller_input_get_state(&input);

    if (ble_ready) {
      send_button_state_notification(&st);
    }

    vTaskDelay(pdMS_TO_TICKS(10));
  }
}

void app_main(void) {
  /* Local variables */
  int rc;
  esp_err_t ret;

  /* LED initialization */
  // led_init();

  controller_input_init(&input);

  for (size_t i = 0;
       i < sizeof(controller_buttons) / sizeof(controller_buttons[0]); i++) {
    controller_input_add_button(
        &input, controller_buttons[i].gpio, controller_buttons[i].active_low,
        controller_buttons[i].debounce_ms, controller_buttons[i].hold_ms);
  }

  ESP_ERROR_CHECK(display_init());
  display_set_state(DISPLAY_STATE_BOOT);

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
  xTaskCreate(nimble_host_task, "NimBLE Host", 4 * 1024, NULL, 6, NULL);
  xTaskCreate(controller_task, "Controller State", 4 * 1024, NULL, 5, NULL);
  return;
}
