file(GLOB_RECURSE srcs
    "main.c"
    "src/*.c"
)

message(STATUS "SRC FILES: ${srcs}")

idf_component_register(
    SRCS ${srcs}
    INCLUDE_DIRS include
    PRIV_REQUIRES driver bt nvs_flash esp_driver_gpio
)

