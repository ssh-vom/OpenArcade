/*
 * OpenArcade BLE GATT Service
 */
#include "gatt_svc.h"
#include "common.h"
#include "host/ble_gatt.h"
#include "host/ble_hs.h"
#include "nimble/nimble_port.h"
#include <string.h>

/* ================================
 * UUIDs (little endian)
 * ================================ */
static const ble_uuid128_t openarcade_svc_uuid =
    BLE_UUID128_INIT(0x01, 0x00, 0x00, 0x00, 0x00, 0x65, 0x64, 0x61, 0x63, 0x72,
                     0x61, 0x6e, 0x65, 0x70, 0x6f, 0x66);

static const ble_uuid128_t controller_state_chr_uuid =
    BLE_UUID128_INIT(0x02, 0x00, 0x00, 0x00, 0x00, 0x65, 0x64, 0x61, 0x63, 0x72,
                     0x61, 0x6e, 0x65, 0x70, 0x6f, 0x66);
/* ================================
 * State
 * ================================ */

static uint16_t controller_state_chr_handle;
static uint16_t conn_handle = BLE_HS_CONN_HANDLE_NONE;
static bool notify_enabled = false;

/* ================================
 * GATT Definition
 * ================================ */
static int controller_state_access_cb(uint16_t conn_handle,
                                      uint16_t attr_handle,
                                      struct ble_gatt_access_ctxt *ctxt,
                                      void *arg) {
  if (ctxt->op == BLE_GATT_ACCESS_OP_READ_CHR) {
    controller_state_t zero = {0};
    return os_mbuf_append(ctxt->om, &zero, sizeof(zero)) == 0
               ? 0
               : BLE_ATT_ERR_INSUFFICIENT_RES;
  }
  return 0;
}

static const struct ble_gatt_svc_def gatt_svr_svcs[] = {
    {
        .type = BLE_GATT_SVC_TYPE_PRIMARY,
        .uuid = &openarcade_svc_uuid.u,
        .characteristics =
            (struct ble_gatt_chr_def[]){
                {
                    .uuid = &controller_state_chr_uuid.u,
                    .access_cb = controller_state_access_cb,
                    .flags = BLE_GATT_CHR_F_NOTIFY,
                    .val_handle = &controller_state_chr_handle,
                },
                {0}},
    },
    {0},
};

int gatt_svc_init(void) {
  int rc;

  ble_svc_gatt_init();

  rc = ble_gatts_count_cfg(gatt_svr_svcs);
  if (rc != 0)
    return rc;

  rc = ble_gatts_add_svcs(gatt_svr_svcs);
  if (rc != 0)
    return rc;

  return 0;
}

void send_button_state_notification(const controller_state_t *state) {
  if (!notify_enabled || conn_handle == BLE_HS_CONN_HANDLE_NONE)
    return;

  if (controller_state_chr_handle == 0) {
    ESP_LOGW(TAG, "NOTIFICATION SKIPPED: HANDLE NOT YET REGISTERED");
    return;
  }

  struct os_mbuf *om = ble_hs_mbuf_from_flat(state, sizeof(*state));

  if (!om) {
    ESP_LOGE(TAG, "Failed to allocate mbuf");
    return;
  }

  int rc =
      ble_gatts_notify_custom(conn_handle, controller_state_chr_handle, om);

  if (rc != 0) {
    ESP_LOGW(TAG, "Notify failed rc=%d", rc);
  }
}

void gatt_svr_subscribe_cb(struct ble_gap_event *event) {
  if (event->type != BLE_GAP_EVENT_SUBSCRIBE) {
    return;
  }

  if (event->subscribe.attr_handle == controller_state_chr_handle) {
    notify_enabled = event->subscribe.cur_notify;
    conn_handle =
        notify_enabled ? event->subscribe.conn_handle : BLE_HS_CONN_HANDLE_NONE;

    ESP_LOGI(TAG, "Controller notify %s",
             notify_enabled ? "ENABLED" : "DISABLED");
  }
}

/* ================================
 * Register Debug
 * ================================ */

void gatt_svr_register_cb(struct ble_gatt_register_ctxt *ctxt, void *arg) {
#if CONFIG_LOG_DEFAULT_LEVEL_DEBUG
  char buf[BLE_UUID_STR_LEN];

  if (ctxt->op == BLE_GATT_REGISTER_OP_SVC ||
      ctxt->op == BLE_GATT_REGISTER_OP_CHR) {
    ESP_LOGD(TAG, "registered %s",
             ble_uuid_to_str(ctxt->svc.svc_def->uuid, buf));
  }
#endif
}
