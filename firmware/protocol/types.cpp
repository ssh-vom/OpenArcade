#include <cstdint>
#include <string>

struct ButtonConfig {
  ButtonConfig();

public:
  uint8_t buttonId;
  uint8_t hardwareIndex; // hardware index
  uint8_t actionCode;
  uint8_t keybindingCode;
  float sensitivity;
  uint8_t version;
};

ButtonConfig::ButtonConfig() {
  buttonId = uint8_t(1000);
  hardwareIndex = uint8_t(1000);
  actionCode = 0;
  keybindingCode = 0;
  sensitivity = 0.0;
  version = 1;
}

struct BoardConfig {
  std::string boardId;
  ButtonConfig buttons[];
};
