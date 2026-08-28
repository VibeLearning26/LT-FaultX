# ESP32 Firmware for LT-FaultX

Firmware for the ESP32-based LT line-break detection prototype.

## Hardware Connections

| Component | ESP32 Pin | Notes |
|-----------|-----------|-------|
| ACS712 Current Sensor | GPIO35 (ADC1_CH7) | 5A version (185mV/A) |
| Voltage Sensor (0-25V) | GPIO34 (ADC1_CH6) | 5:1 divider |
| Relay Module | GPIO25 | Active-low |
| Green LED | GPIO26 | Healthy indication |
| Red LED | GPIO27 | Fault indication |
| Buzzer | GPIO14 | Audible alarm |
| Load 1 LED | GPIO12 | Load status |
| Load 2 LED | GPIO13 | Load status |
| LCD I2C SDA | GPIO21 | Character LCD |
| LCD I2C SCL | GPIO22 | Character LCD |

## Configuration

Edit the following constants in `lt_faultx_esp32.ino`:

```cpp
// WiFi
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend
const char* BACKEND_BASE_URL = "http://192.168.1.100:8000";
const char* DEVICE_ID = "ESP32-POLE-01";
const char* DEVICE_API_KEY = "YOUR_DEVICE_API_KEY";  // Must match backend
```

## Fault Detection Logic

The firmware implements a state machine with these states:

- **STARTING** - Initial boot, sensors stabilizing
- **HEALTHY** - Voltage & current within thresholds, relay closed
- **FAULT** - Voltage/current out of range while relay closed
- **ISOLATED** - Relay intentionally opened
- **SENSOR_ERROR** - Obviously invalid readings

### Thresholds (configurable via backend)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MIN_HEALTHY_VOLTAGE` | 10.0V | Below = fault |
| `MAX_HEALTHY_VOLTAGE` | 28.0V | Above = fault |
| `MIN_HEALTHY_CURRENT` | 0.05A | Below = possible fault |
| `FAULT_CONFIRM_DELAY_MS` | 2000ms | Confirm fault after this duration |
| `FAULT_RECOVERY_DELAY_MS` | 5000ms | Confirm recovery after this duration |
| `TELEMETRY_INTERVAL_MS` | 1000ms | Telemetry send interval |
| `AUTO_ISOLATION_ENABLED` | true | Auto-open relay on confirmed fault |

## Communication Protocol

### Telemetry (ESP32 → Backend)
```
POST /api/devices/{device_id}/telemetry
Headers: X-Device-API-Key: <key>
Body: {
  "device_id": "ESP32-POLE-01",
  "voltage_post_2": 12.1,
  "current": 0.42,
  "line_status": "HEALTHY",
  "relay_state": true,
  "green_led": true,
  "red_led": false,
  "buzzer": false,
  "load_1": true,
  "load_2": true,
  "wifi_rssi": -55,
  "uptime_seconds": 3600,
  "firmware_version": "1.0.0",
  "sequence_number": 123
}
```

### Command Polling (ESP32 → Backend)
```
GET /api/devices/{device_id}/command
Headers: X-Device-API-Key: <key>
Response (200): {
  "command_id": "uuid",
  "command": "OPEN_RELAY|CLOSE_RELAY|RESET_FAULT|REQUEST_STATUS",
  "parameters": {"relay": "k1", "desired_state": false}
}
Response (204): No pending commands
```

### Command Acknowledgement (ESP32 → Backend)
```
POST /api/devices/{device_id}/command/{command_id}/ack
Headers: X-Device-API-Key: <key>
Body: {
  "command_id": "uuid",
  "status": "ACKNOWLEDGED|EXECUTED|FAILED",
  "result_state": true,
  "message": "Command executed"
}
```

### Config Fetch (ESP32 → Backend)
```
GET /api/devices/{device_id}/config
Headers: X-Device-API-Key: <key>
```

## Building & Flashing

### Using PlatformIO (Recommended)

```bash
cd esp32_firmware
pio run -e esp32dev          # Build
pio run -e esp32dev -t upload # Flash
pio device monitor            # Serial monitor
```

### Using Arduino IDE

1. Install ESP32 board package
2. Install libraries: ArduinoJson, LiquidCrystal_I2C
3. Open `lt_faultx_esp32.ino`
4. Select board: "ESP32 Dev Module"
5. Upload

## Local Operation

**Critical**: The ESP32 continues detecting faults and controlling local indicators (LEDs, buzzer, relay, LCD) even when:
- WiFi is disconnected
- Backend is unreachable
- Network communication fails

Only telemetry sending and command polling require network connectivity.

## Safety Features

- **Relay hysteresis**: Minimum 5s between relay switches
- **Fault confirmation**: Requires sustained abnormal readings for 2s
- **Recovery confirmation**: Requires sustained normal readings for 5s
- **Unknown command rejection**: Never executes unrecognized commands
- **Explicit relay commands**: Only OPEN_RELAY, CLOSE_RELAY, RESET_FAULT
- **Local fault detection**: Independent of backend connectivity

## Testing Without Hardware

Use the backend's simulation mode to test the full pipeline:
```bash
# Backend
cd backend && HARDWARE_MODE=simulation python -m uvicorn app.main:app --reload

# Frontend
cd frontend && npm run dev
```

The simulation generates synthetic telemetry for demo nodes.