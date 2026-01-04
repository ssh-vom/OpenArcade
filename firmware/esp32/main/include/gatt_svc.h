#ifndef GATT_SVR_H
#define GATT_SVR_H
#include "controller_input.h"
#include "host/ble_gap.h"
#include "host/ble_gatt.h"
#include "services/gatt/ble_svc_gatt.h"
#include <stdbool.h>
#include <stdint.h>

/* NimBLE GAP APIs */
#include "host/ble_gap.h"

/* Public function declarations */
int gatt_svc_init(void);

/* Called from controller task */
void send_button_state_notification(const controller_state_t *state);

/* Subscribe Callback from GAP */
void gatt_svr_register_cb(struct ble_gatt_register_ctxt *ctxt, void *arg);

/* Register Callback (optional for logging) */
void gatt_svr_subscribe_cb(struct ble_gap_event *event);

#endif // GATT_SVR_H
