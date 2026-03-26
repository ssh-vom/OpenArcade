#ifndef GAP_H
#define GAP_H

#include "host/ble_gap.h"
#include "services/gap/ble_svc_gap.h"
#include <stdbool.h>

typedef enum {
  GAP_STATE_IDLE,
  GAP_STATE_ADVERTISING,
  GAP_STATE_CONNECTED,
} gap_state_t;

void adv_init(void);
int gap_init(void);

void gap_request_pair(void);
bool gap_is_connected(void);
gap_state_t gap_get_state(void);

#endif /* GAP_H */
