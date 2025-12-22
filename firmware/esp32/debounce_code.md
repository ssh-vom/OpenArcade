````c
// filepath: controller_input.h
#ifndef CONTROLLER_INPUT_H
#define CONTROLLER_INPUT_H

#include <stdint.h>
#include <stdbool.h>

#define MAX_BUTTONS 16

// Button states for debouncing FSM
typedef enum {
    BTN_STATE_RELEASED,      // Button is released (stable)
    BTN_STATE_PRESS_DETECTED, // Initial press detected (unstable)
    BTN_STATE_PRESSED,       // Button is pressed (stable)
    BTN_STATE_RELEASE_DETECTED // Initial release detected (unstable)
} button_state_t;

// Button event types
typedef enum {
    BUTTON_EVENT_NONE,
    BUTTON_EVENT_PRESSED,
    BUTTON_EVENT_RELEASED,
    BUTTON_EVENT_HELD
} button_event_t;

// Individual button configuration
typedef struct {
    uint8_t gpio_pin;           // GPIO pin number
    bool active_low;           // True if button is active low
    uint32_t debounce_ms;      // Debounce time in milliseconds
    uint32_t hold_threshold_ms; // Time to consider as "held"
    
    // State machine variables
    button_state_t state;
    uint32_t last_state_change_time;
    bool last_stable_state;
    
    // Event flags (can be polled or trigger callbacks)
    button_event_t pending_event;
    
    // For callback system
    void (*event_callback)(uint8_t button_id, button_event_t event);
} button_config_t;

// Frame-based input controller
typedef struct {
    button_config_t buttons[MAX_BUTTONS];
    uint8_t button_count;
    uint32_t last_update_time;
    uint32_t update_interval_ms; // Frame rate/throttle interval
    uint64_t gpio_input_reg;     // Cached GPIO input states (up to 64 pins)
} input_controller_t;

// Initialize the entire input controller
bool input_controller_init(input_controller_t *ctrl, uint32_t update_interval_ms);

// Add a button to the controller
bool input_controller_add_button(input_controller_t *ctrl, 
                                uint8_t gpio_pin, 
                                bool active_low,
                                uint32_t debounce_ms,
                                uint32_t hold_threshold_ms,
                                void (*callback)(uint8_t button_id, button_event_t event));

// Update all buttons at once (call this from your main loop or timer)
void input_controller_update(input_controller_t *ctrl);

// Get event for a specific button (alternative to callback)
button_event_t input_controller_get_event(input_controller_t *ctrl, uint8_t button_id);

// Get current stable state of a button
bool input_controller_is_pressed(input_controller_t *ctrl, uint8_t button_id);

// Read all GPIOs at once and update cache
void input_controller_read_gpios(input_controller_t *ctrl);

// Single function to handle all input processing (ideal for timer interrupt)
void input_controller_process(input_controller_t *ctrl);

#endif // CONTROLLER_INPUT_H
````

````c
// filepath: controller_input.c
#include "controller_input.h"
#include "driver/gpio.h"
#include "freertos/FreeRTOS.h"
#include "esp_timer.h"
#include <string.h>

#define DEBOUNCE_DEFAULT_MS 50
#define HOLD_THRESHOLD_DEFAULT_MS 2000
#define DEFAULT_UPDATE_INTERVAL_MS 10  // 100Hz update rate

static uint32_t get_current_time_ms(void) {
    return (uint32_t)(esp_timer_get_time() / 1000);
}

bool input_controller_init(input_controller_t *ctrl, uint32_t update_interval_ms) {
    if (!ctrl) return false;
    
    memset(ctrl, 0, sizeof(input_controller_t));
    ctrl->update_interval_ms = (update_interval_ms > 0) ? update_interval_ms : DEFAULT_UPDATE_INTERVAL_MS;
    ctrl->last_update_time = get_current_time_ms();
    ctrl->gpio_input_reg = 0;
    
    return true;
}

bool input_controller_add_button(input_controller_t *ctrl, 
                                uint8_t gpio_pin, 
                                bool active_low,
                                uint32_t debounce_ms,
                                uint32_t hold_threshold_ms,
                                void (*callback)(uint8_t button_id, button_event_t event)) {
    if (!ctrl || ctrl->button_count >= MAX_BUTTONS) {
        return false;
    }
    
    // Configure GPIO
    gpio_config_t io_conf = {
        .pin_bit_mask = (1ULL << gpio_pin),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };
    
    if (gpio_config(&io_conf) != ESP_OK) {
        return false;
    }
    
    // Initialize button config
    button_config_t *btn = &ctrl->buttons[ctrl->button_count];
    btn->gpio_pin = gpio_pin;
    btn->active_low = active_low;
    btn->debounce_ms = (debounce_ms > 0) ? debounce_ms : DEBOUNCE_DEFAULT_MS;
    btn->hold_threshold_ms = (hold_threshold_ms > 0) ? hold_threshold_ms : HOLD_THRESHOLD_DEFAULT_MS;
    btn->state = BTN_STATE_RELEASED;
    btn->last_state_change_time = get_current_time_ms();
    btn->last_stable_state = false;  // Start as released
    btn->pending_event = BUTTON_EVENT_NONE;
    btn->event_callback = callback;
    
    ctrl->button_count++;
    return true;
}

void input_controller_read_gpios(input_controller_t *ctrl) {
    if (!ctrl) return;
    
    // Read all GPIO states at once for consistency
    uint64_t gpio_input = 0;
    
    // Read GPIO registers directly for speed (alternative to gpio_get_level per pin)
    // ESP32-specific: GPIO_IN_REG contains lower 32 GPIOs, GPIO_IN1_REG contains higher 32
    uint32_t gpio_in_low = GPIO.in;
    uint32_t gpio_in_high = GPIO.in1.val;
    gpio_input = ((uint64_t)gpio_in_high << 32) | gpio_in_low;
    
    ctrl->gpio_input_reg = gpio_input;
}

void input_controller_process(input_controller_t *ctrl) {
    if (!ctrl) return;
    
    uint32_t current_time = get_current_time_ms();
    
    // Check if enough time has passed for next frame
    if ((current_time - ctrl->last_update_time) < ctrl->update_interval_ms) {
        return;  // Skip this update (frame throttling)
    }
    
    ctrl->last_update_time = current_time;
    
    // Process all buttons in batch
    for (int i = 0; i < ctrl->button_count; i++) {
        button_config_t *btn = &ctrl->buttons[i];
        
        // Extract this button's state from cached GPIO register
        bool raw_state = (ctrl->gpio_input_reg >> btn->gpio_pin) & 0x1;
        bool logical_pressed = (raw_state == (btn->active_low ? 0 : 1));
        
        // State machine update (similar to per-button version but with shared timing)
        switch (btn->state) {
            case BTN_STATE_RELEASED:
                if (logical_pressed && !btn->last_stable_state) {
                    btn->state = BTN_STATE_PRESS_DETECTED;
                    btn->last_state_change_time = current_time;
                }
                break;
                
            case BTN_STATE_PRESS_DETECTED:
                if (!logical_pressed) {
                    btn->state = BTN_STATE_RELEASED;
                } else if ((current_time - btn->last_state_change_time) >= btn->debounce_ms) {
                    btn->state = BTN_STATE_PRESSED;
                    btn->last_stable_state = true;
                    btn->pending_event = BUTTON_EVENT_PRESSED;
                    btn->last_state_change_time = current_time;  // Reset for hold timing
                    
                    // Trigger callback if registered
                    if (btn->event_callback) {
                        btn->event_callback(i, BUTTON_EVENT_PRESSED);
                    }
                }
                break;
                
            case BTN_STATE_PRESSED:
                if (!logical_pressed && btn->last_stable_state) {
                    btn->state = BTN_STATE_RELEASE_DETECTED;
                    btn->last_state_change_time = current_time;
                    
                    // Check for hold event
                    if ((current_time - btn->last_state_change_time) >= btn->hold_threshold_ms) {
                        btn->pending_event = BUTTON_EVENT_HELD;
                        if (btn->event_callback) {
                            btn->event_callback(i, BUTTON_EVENT_HELD);
                        }
                    }
                } else {
                    // Check for hold event while still pressed
                    if ((current_time - btn->last_state_change_time) >= btn->hold_threshold_ms) {
                        btn->pending_event = BUTTON_EVENT_HELD;
                        if (btn->event_callback) {
                            btn->event_callback(i, BUTTON_EVENT_HELD);
                        }
                        // Reset hold timer to prevent continuous hold events
                        btn->last_state_change_time = current_time;
                    }
                }
                break;
                
            case BTN_STATE_RELEASE_DETECTED:
                if (logical_pressed) {
                    btn->state = BTN_STATE_PRESSED;
                } else if ((current_time - btn->last_state_change_time) >= btn->debounce_ms) {
                    btn->state = BTN_STATE_RELEASED;
                    btn->last_stable_state = false;
                    btn->pending_event = BUTTON_EVENT_RELEASED;
                    
                    // Trigger callback if registered
                    if (btn->event_callback) {
                        btn->event_callback(i, BUTTON_EVENT_RELEASED);
                    }
                }
                break;
        }
    }
}

void input_controller_update(input_controller_t *ctrl) {
    if (!ctrl) return;
    
    // Single batch operation: read all GPIOs, then process all buttons
    input_controller_read_gpios(ctrl);
    input_controller_process(ctrl);
}

button_event_t input_controller_get_event(input_controller_t *ctrl, uint8_t button_id) {
    if (!ctrl || button_id >= ctrl->button_count) {
        return BUTTON_EVENT_NONE;
    }
    
    button_event_t event = ctrl->buttons[button_id].pending_event;
    ctrl->buttons[button_id].pending_event = BUTTON_EVENT_NONE;
    return event;
}

bool input_controller_is_pressed(input_controller_t *ctrl, uint8_t button_id) {
    if (!ctrl || button_id >= ctrl->button_count) {
        return false;
    }
    
    button_config_t *btn = &ctrl->buttons[button_id];
    return (btn->state == BTN_STATE_PRESSED || btn->state == BTN_STATE_PRESS_DETECTED);
}
````

**Example usage showing the frame-based advantage:**

````c
// Example: Using frame-based input controller
#include "controller_input.h"

input_controller_t ctrl;

void button_callback(uint8_t button_id, button_event_t event) {
    const char* button_names[] = {"Start", "Select", "A", "B", "Up", "Down", "Left", "Right"};
    
    switch(event) {
        case BUTTON_EVENT_PRESSED:
            printf("%s pressed\n", button_names[button_id]);
            break;
        case BUTTON_EVENT_RELEASED:
            printf("%s released\n", button_names[button_id]);
            break;
        case BUTTON_EVENT_HELD:
            printf("%s held\n", button_names[button_id]);
            break;
        default:
            break;
    }
}

void app_main(void) {
    // Initialize controller with 10ms update interval (100Hz)
    input_controller_init(&ctrl, 10);
    
    // Add all buttons at once
    input_controller_add_button(&ctrl, GPIO_NUM_0, true, 50, 2000, button_callback);  // Start
    input_controller_add_button(&ctrl, GPIO_NUM_2, true, 50, 2000, button_callback);  // Select
    input_controller_add_button(&ctrl, GPIO_NUM_4, true, 30, 1000, button_callback);  // A
    input_controller_add_button(&ctrl, GPIO_NUM_5, true, 30, 1000, button_callback);  // B
    input_controller_add_button(&ctrl, GPIO_NUM_6, true, 50, 2000, button_callback);  // Up
    input_controller_add_button(&ctrl, GPIO_NUM_7, true, 50, 2000, button_callback);  // Down
    input_controller_add_button(&ctrl, GPIO_NUM_8, true, 50, 2000, button_callback);  // Left
    input_controller_add_button(&ctrl, GPIO_NUM_9, true, 50, 2000, button_callback);  // Right
    
    while (1) {
        // Single call updates ALL buttons efficiently
        input_controller_update(&ctrl);
        
        // You can also poll for specific events if needed
        for (int i = 0; i < ctrl.button_count; i++) {
            button_event_t event = input_controller_get_event(&ctrl, i);
            if (event != BUTTON_EVENT_NONE) {
                // Handle event (alternative to callback)
            }
        }
        
        // Other game loop processing here...
        // Since input is throttled to 100Hz, we can align other updates
        
        vTaskDelay(pdMS_TO_TICKS(5));  // 200Hz loop, but input only processed at 100Hz
    }
}
````



