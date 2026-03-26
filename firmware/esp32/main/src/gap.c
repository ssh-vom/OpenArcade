#include "gap.h"
#include "common.h"
#include "display.h"
#include "gatt_svc.h"

#include <string.h>

/* Low-latency controller-friendly params */
#define CONN_ITVL_MIN 6 // 7.5 ms
#define CONN_ITVL_MAX 12
#define SLAVE_LATENCY 0
#define SUP_TIMEOUT 100 // 1s
#define ADV_DURATION_MS 30000

static uint8_t own_addr_type;
static gap_state_t gap_state = GAP_STATE_IDLE;

static void start_advertising(void);
static void set_gap_state(gap_state_t new_state);
static int gap_event_handler(struct ble_gap_event *event, void *arg);

static void set_gap_state(gap_state_t new_state) {
  if (gap_state == new_state) {
    return;
  }

  gap_state = new_state;

  switch (gap_state) {
  case GAP_STATE_IDLE:
    display_set_state(DISPLAY_STATE_IDLE);
    break;
  case GAP_STATE_ADVERTISING:
    display_set_state(DISPLAY_STATE_PAIRING);
    break;
  case GAP_STATE_CONNECTED:
    display_set_state(DISPLAY_STATE_CONNECTED);
    break;
  }
}

static void start_advertising(void) {
  struct ble_gap_adv_params adv_params = {0};
  struct ble_hs_adv_fields fields = {0};
  int rc;

  if (gap_state == GAP_STATE_CONNECTED) {
    ESP_LOGI(TAG, "Ignoring advertising request while connected");
    return;
  }

  if (gap_state == GAP_STATE_ADVERTISING) {
    ESP_LOGI(TAG, "Ignoring advertising request while already advertising");
    return;
  }

  fields.flags = BLE_HS_ADV_F_DISC_GEN | BLE_HS_ADV_F_BREDR_UNSUP;

  const char *name = ble_svc_gap_device_name();
  fields.name = (uint8_t *)name;
  fields.name_len = strlen(name);
  fields.name_is_complete = 1;

  rc = ble_gap_adv_set_fields(&fields);
  if (rc != 0) {
    ESP_LOGE(TAG, "adv_set_fields failed rc=%d", rc);
    set_gap_state(GAP_STATE_IDLE);
    return;
  }

  adv_params.conn_mode = BLE_GAP_CONN_MODE_UND;
  adv_params.disc_mode = BLE_GAP_DISC_MODE_GEN;
  adv_params.itvl_min = BLE_GAP_ADV_ITVL_MS(20);
  adv_params.itvl_max = BLE_GAP_ADV_ITVL_MS(30);

  rc = ble_gap_adv_start(own_addr_type, NULL, ADV_DURATION_MS, &adv_params,
                         gap_event_handler, NULL);
  if (rc != 0) {
    ESP_LOGE(TAG, "adv_start failed rc=%d", rc);
    set_gap_state(GAP_STATE_IDLE);
    return;
  }

  ESP_LOGI(TAG, "Advertising started for %d ms", ADV_DURATION_MS);
  set_gap_state(GAP_STATE_ADVERTISING);
}

static int gap_event_handler(struct ble_gap_event *event, void *arg) {
  struct ble_gap_conn_desc desc;
  int rc;

  switch (event->type) {
  case BLE_GAP_EVENT_CONNECT:
    ESP_LOGI(TAG, "Connection %s",
             event->connect.status == 0 ? "established" : "failed");

    if (event->connect.status != 0) {
      set_gap_state(GAP_STATE_IDLE);
      start_advertising();
      return 0;
    }

    set_gap_state(GAP_STATE_CONNECTED);

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
    set_gap_state(GAP_STATE_IDLE);
    start_advertising();
    return 0;

  case BLE_GAP_EVENT_SUBSCRIBE:
    gatt_svr_subscribe_cb(event);
    return 0;

  case BLE_GAP_EVENT_NOTIFY_TX:
    if (event->notify_tx.status != 0) {
      ESP_LOGW(TAG, "Notify failed, status=%d", event->notify_tx.status);
      gatt_svc_reset_connection_state();
      ble_gap_terminate(event->notify_tx.conn_handle,
                        BLE_ERR_REM_USER_CONN_TERM);
    }
    return 0;

  case BLE_GAP_EVENT_ADV_COMPLETE:
    ESP_LOGI(TAG, "Advertising complete, reason=%d",
             event->adv_complete.reason);
    set_gap_state(GAP_STATE_IDLE);
    return 0;

  default:
    return 0;
  }
}

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

void gap_request_pair(void) {
  if (gap_state == GAP_STATE_CONNECTED) {
    ESP_LOGI(TAG, "Ignoring pair request while connected");
    return;
  }

  if (gap_state == GAP_STATE_ADVERTISING) {
    ESP_LOGI(TAG, "Ignoring pair request while already advertising");
    return;
  }

  start_advertising();
}

bool gap_is_connected(void) { return gap_state == GAP_STATE_CONNECTED; }

gap_state_t gap_get_state(void) { return gap_state; }

int gap_init(void) {
  int rc;

  ble_svc_gap_init();

  rc = ble_svc_gap_device_name_set(DEVICE_NAME);
  if (rc != 0) {
    ESP_LOGE(TAG, "Failed to set device name");
  }

  return rc;
}
