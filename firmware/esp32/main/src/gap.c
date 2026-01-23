#include "gap.h"
#include "common.h"
#include "display.h"
#include "gatt_svc.h"
#include "esp_timer.h"

/* Low-latency controller-friendly params */
#define CONN_ITVL_MIN 6 // 7.5 ms
#define CONN_ITVL_MAX 12
#define SLAVE_LATENCY 0
#define SUP_TIMEOUT 100 // 1s
#define ADV_RESTART_DELAY_MS 2000

static uint8_t own_addr_type;
static esp_timer_handle_t adv_restart_timer;

/* Forward declarations */
static void start_advertising(void);
static int gap_event_handler(struct ble_gap_event *event, void *arg);
static void schedule_advertising_restart(void);

static void adv_restart_cb(void *arg) {
  display_set_state(DISPLAY_STATE_PAIRING);
  start_advertising();
}

static void schedule_advertising_restart(void) {
  if (adv_restart_timer == NULL) {
    esp_timer_create_args_t timer_args = {
        .callback = adv_restart_cb,
        .arg = NULL,
        .dispatch_method = ESP_TIMER_TASK,
        .name = "adv_restart",
    };

    int rc = esp_timer_create(&timer_args, &adv_restart_timer);
    if (rc != ESP_OK) {
      ESP_LOGE(TAG, "Failed to create adv restart timer rc=%d", rc);
      return;
    }
  }

  esp_timer_stop(adv_restart_timer);
  esp_timer_start_once(adv_restart_timer, ADV_RESTART_DELAY_MS * 1000);
}

/* ================================
 * Advertising
 * ================================ */

static void start_advertising(void) {
  struct ble_gap_adv_params adv_params = {0};
  struct ble_hs_adv_fields fields = {0};
  int rc;

  /* Flags */
  fields.flags = BLE_HS_ADV_F_DISC_GEN | BLE_HS_ADV_F_BREDR_UNSUP;

  /* Device name */
  const char *name = ble_svc_gap_device_name();
  fields.name = (uint8_t *)name;
  fields.name_len = strlen(name);
  fields.name_is_complete = 1;

  rc = ble_gap_adv_set_fields(&fields);
  if (rc != 0) {
    ESP_LOGE(TAG, "adv_set_fields failed rc=%d", rc);
    return;
  }

  adv_params.conn_mode = BLE_GAP_CONN_MODE_UND;
  adv_params.disc_mode = BLE_GAP_DISC_MODE_GEN;
  adv_params.itvl_min = BLE_GAP_ADV_ITVL_MS(20);
  adv_params.itvl_max = BLE_GAP_ADV_ITVL_MS(30);

  rc = ble_gap_adv_start(own_addr_type, NULL, BLE_HS_FOREVER, &adv_params,
                         gap_event_handler, NULL);

  if (rc != 0) {
    ESP_LOGE(TAG, "adv_start failed rc=%d", rc);
    return;
  }

  ESP_LOGI(TAG, "Advertising started");
}

/* ================================
 * GAP Events
 * ================================ */

static int gap_event_handler(struct ble_gap_event *event, void *arg) {
  struct ble_gap_conn_desc desc;
  int rc;

  switch (event->type) {

  case BLE_GAP_EVENT_CONNECT:
    ESP_LOGI(TAG, "Connection %s",
             event->connect.status == 0 ? "established" : "failed");

    if (event->connect.status != 0) {
      start_advertising();
      return 0;
    }

    if (adv_restart_timer != NULL) {
      esp_timer_stop(adv_restart_timer);
    }

    rc = ble_gap_conn_find(event->connect.conn_handle, &desc);
    if (rc == 0) {
      struct ble_gap_upd_params params = {
          .itvl_min = CONN_ITVL_MIN,
          .itvl_max = CONN_ITVL_MAX,
          .latency = SLAVE_LATENCY,
          .supervision_timeout = SUP_TIMEOUT,
      };
      ble_gap_update_params(event->connect.conn_handle, &params);
    }
    return 0;

  case BLE_GAP_EVENT_DISCONNECT:
    ESP_LOGI(TAG, "Disconnected");
    gatt_svc_reset_connection_state();
    display_set_state(DISPLAY_STATE_IDLE);
    schedule_advertising_restart();
    return 0;

  case BLE_GAP_EVENT_SUBSCRIBE:
    display_set_state(DISPLAY_STATE_CONNECTED);
    gatt_svr_subscribe_cb(event);
    return 0;

  case BLE_GAP_EVENT_NOTIFY_TX:
    if (event->notify_tx.status != 0) {
      ESP_LOGW(TAG, "Notify failed, status=%d", event->notify_tx.status);
      gatt_svc_reset_connection_state();
      display_set_state(DISPLAY_STATE_IDLE);
      ble_gap_terminate(event->notify_tx.conn_handle,
                        BLE_ERR_REM_USER_CONN_TERM);
      schedule_advertising_restart();
    }
    return 0;

  case BLE_GAP_EVENT_ADV_COMPLETE:
    start_advertising();
    return 0;

  default:
    return 0;
  }
}

/* ================================
 * Public API
 * ================================ */

void adv_init(void) {
  int rc;

  rc = ble_hs_util_ensure_addr(0);
  if (rc != 0) {
    ESP_LOGE(TAG, "No BLE address");
    return;
  }

  rc = ble_hs_id_infer_auto(0, &own_addr_type);
  if (rc != 0) {
    ESP_LOGE(TAG, "Failed to infer addr type");
    return;
  }

  start_advertising();
}

int gap_init(void) {
  int rc;

  ble_svc_gap_init();

  rc = ble_svc_gap_device_name_set(DEVICE_NAME);
  if (rc != 0) {
    ESP_LOGE(TAG, "Failed to set device name");
  }

  return rc;
}
