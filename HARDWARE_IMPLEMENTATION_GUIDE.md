# LT-FaultX ESP32 Hardware Implementation Guide

This guide walks you through connecting the ESP32-based LT line-break detection prototype to the LT-FaultX web application.

---

## 📋 Prerequisites

### Hardware Required
| Component | Specification | Qty |
|-----------|---------------|-----|
| ESP32-WROOM-32 / ESP-32S | Dev board with USB | 1 |
| ACS712 Current Sensor | 5A version (185mV/A) | 1 |
| Voltage Sensor Module | 0-25V DC (5:1 divider) | 1 |
| 5V Relay Module | Active-low, 1-channel | 1 |
| Green LED | 5mm, for healthy status | 1 |
| Red LED | 5mm, for fault status | 1 |
| Buzzer | Active buzzer (5V) | 1 |
| Character LCD + I2C | 16x2 with PCF8574 backpack | 1 |
| 12V LED Loads | Represent line loads | 2 |
| 12V DC Power Supply | For loads & ESP32 (via regulator) | 1 |
| Breadboard/PCB + Wires | For connections | As needed |

### Software/Accounts
- GitHub account with access to `VibeLearning26/LT-FaultX`
- Arduino IDE or VS Code + PlatformIO
- Python 3.8+ (for simulator/testing)
- Supabase project (already configured in repo)

---

## 🔧 Hardware Wiring

### ESP32 Pin Assignments

| Function | ESP32 Pin | Notes |
|----------|-----------|-------|
| ACS712 Current Sensor | GPIO35 (ADC1_CH7) | Input only |
| Voltage Sensor (0-25V) | GPIO34 (ADC1_CH6) | Input only |
| Relay Control | GPIO25 | Active-low |
| Green LED | GPIO26 | Healthy indication |
| Red LED | GPIO27 | Fault indication |
| Buzzer | GPIO14 | Audible alarm |
| Load 1 LED | GPIO12 | Load status |
| Load 2 LED | GPIO13 | Load status |
| LCD I2C SDA | GPIO21 | Character LCD |
| LCD I2C SCL | GPIO22 | Character LCD |

### Wiring Diagram

```
                    ┌─────────────────────────────────────┐
                    │           ESP32-WROOM-32            │
                    └─────────────────────────────────────┘
           3.3V ◄──┤                                          ├──┬──► 5V (Relay VCC)
           GND ◄───┤                                         ├──┤
                   │  GPIO35 (ADC1_CH7)  ◄── ACS712 OUT      │
                   │  GPIO34 (ADC1_CH6)  ◄── Voltage Sensor  │
                   │  GPIO25  ──► Relay IN (Active LOW)     │
                   │  GPIO26  ──► Green LED (+)             │
                   │  GPIO27  ──► Red LED (+)               │
                   │  GPIO14  ──► Buzzer (+)                │
                   │  GPIO12  ──► Load 1 LED (+)            │
                   │  GPIO13  ──► Load 2 LED (+)            │
                   │  GPIO21 (SDA) ──► LCD SDA              │
                   │  GPIO22 (SCL) ──► LCD SCL              │
                   └─────────────────────────────────────────┘

ACS712:          VCC → 5V, GND → GND, OUT → GPIO35
Voltage Sensor:  VCC → 5V, GND → GND, SIGNAL → GPIO34
Relay Module:    VCC → 5V, GND → GND, IN → GPIO25
LEDs/Buzzer:     Anode → GPIO, Cathode → GND (with 220Ω resistors)
LCD I2C:         VCC → 5V, GND → GND, SDA → GPIO21, SCL → GPIO22
Loads:           12V+ → Load → MOSFET/Relay → GND (controlled by ESP32)
```

### Power Supply Notes
- **ESP32**: Power via USB or 5V pin (from 12V→5V buck converter)
- **Relay Module**: 5V (separate from ESP32 if possible to avoid brownout)
- **Sensors**: 5V from same supply
- **Loads**: 12V DC supply through relay contacts
- **Common Ground**: All GNDs must be connected together

---

## 💻 Backend Setup

### 1. Clone & Configure

```bash
git clone https://github.com/VibeLearning26/LT-FaultX.git
cd LT-FaultX
```

### 2. Backend Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your values:
nano .env
```

Required `.env` values:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_your_service_role_key_here
FRONTEND_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
HARDWARE_MODE=live
MQTT_HOST=localhost
MQTT_PORT=1883
RELAY_ACK_TIMEOUT=10
DEVICE_API_KEY=your-secure-random-api-key-here  # IMPORTANT: Generate a strong key!
```

**Generate a secure API key:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Supabase Database

Run migrations in Supabase SQL Editor (in order):
```bash
# Files in supabase/migrations/:
# 0001_profiles.sql
# 0002_devices_locations.sql
# 0003_telemetry_faults.sql
# 0004_relay_status_config.sql
# 0005_reports_maintenance_notifications.sql
# 0006_audit_firmware.sql
# 0007_rls_policies.sql
# 0008_storage_firmware.sql
```

Then seed data:
```bash
# supabase/seed/:
# seed_pincodes.sql
# seed_devices.sql
# set_roles.sql
```

### 4. Register ESP32 Device in Database

```sql
-- Insert your ESP32 device
INSERT INTO public.devices (device_id, name, sequence, is_active)
VALUES ('ESP32-POLE-01', 'LT Pole 01', 1, true);

-- Set location (use a Kerala pincode from pincode_locations)
INSERT INTO public.device_locations (device_id, pincode, locality, district, latitude, longitude)
SELECT id, '682001', 'Fort Kochi', 'Ernakulam', 9.965, 76.2424
FROM public.devices WHERE device_id = 'ESP32-POLE-01';

-- Default configuration
INSERT INTO public.device_configuration (device_id, voltage_fault_threshold, current_warning_threshold, fault_debounce_ms, telemetry_interval_ms, auto_isolation_enabled, buzzer_enabled)
SELECT id, 10.0, 0.05, 2000, 1000, true, true
FROM public.devices WHERE device_id = 'ESP32-POLE-01';
```

### 5. Run Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Verify:
- Health: http://localhost:8000/health
- API Docs: http://localhost:8000/docs

---

## 🌐 Frontend Setup

### 1. Frontend Environment

```bash
cd frontend
cp .env.local.example .env.local
nano .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_your_anon_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:8000/ws/telemetry
NEXT_PUBLIC_DEFAULT_MODE=live
```

### 2. Run Frontend

```bash
npm install
npm run dev
```

Open http://localhost:3000

### 3. Login & Access Hardware Monitor

Demo accounts (after running `backend/scripts/seed_users.py`):
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.local | Demo@Admin123 |
| Operator | operator@demo.local | Demo@Operator123 |
| Citizen | citizen@demo.local | Demo@User123 |

Navigate to:
- **Operator Hardware Monitor**: `/operator/hardware`
- **Admin Device Management**: `/admin/devices`

---

## 📱 ESP32 Firmware

### 1. Using PlatformIO (Recommended)

```bash
cd esp32_firmware
pio run -e esp32dev          # Build
pio run -e esp32dev -t upload # Flash to ESP32
pio device monitor            # Serial monitor (115200 baud)
```

### 2. Using Arduino IDE

1. Install ESP32 board package: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
2. Board: "ESP32 Dev Module"
3. Install libraries:
   - ArduinoJson (v7+)
   - LiquidCrystal_I2C
4. Open `lt_faultx_esp32.ino`
5. Update configuration at top of file:
   ```cpp
   const char* WIFI_SSID = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   const char* BACKEND_BASE_URL = "http://192.168.1.100:8000";  // Your backend IP
   const char* DEVICE_ID = "ESP32-POLE-01";
   const char* DEVICE_API_KEY = "YOUR_DEVICE_API_KEY";  // Match backend .env
   ```
6. Select port and upload

### 3. Firmware Configuration Parameters

All thresholds can be configured remotely via backend (no re-flash needed):

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MIN_HEALTHY_VOLTAGE` | 10.0V | Below = fault |
| `MAX_HEALTHY_VOLTAGE` | 28.0V | Above = fault |
| `MIN_HEALTHY_CURRENT` | 0.05A | Below = possible fault |
| `FAULT_CONFIRM_DELAY_MS` | 2000ms | Confirm fault after duration |
| `FAULT_RECOVERY_DELAY_MS` | 5000ms | Confirm recovery after duration |
| `TELEMETRY_INTERVAL_MS` | 1000ms | Telemetry send interval |
| `AUTO_ISOLATION_ENABLED` | true | Auto-open relay on confirmed fault |
| `BUZZER_ENABLED` | true | Enable buzzer on fault |

### 4. Serial Monitor Output

Expected startup:
```
=== LT-FaultX ESP32 Firmware ===
Device ID: ESP32-POLE-01
Firmware: 1.0.0

Connecting to WiFi: YOUR_SSID
.....
WiFi connected!
IP: 192.168.1.50
RSSI: -52

Config loaded from backend
Setup complete
```

Normal operation:
```
Telemetry sent: V=12.1V I=0.42A State=HEALTHY Relay=CLOSED
Received command: OPEN_RELAY (cmd-uuid-123)
Command cmd-uuid-123 acknowledged: ACKNOWLEDGED
```

---

## 🧪 Testing Without Hardware (Simulator)

Use the Python simulator to test the full pipeline:

```bash
cd esp32_firmware
pip install httpx
python esp32_simulator.py \
  --device-id ESP32-POLE-01 \
  --api-key YOUR_DEVICE_API_KEY \
  --backend http://localhost:8000 \
  --telemetry-interval 1.0 \
  --command-poll-interval 2.0
```

The simulator:
- Sends realistic telemetry every 1s
- Simulates voltage/current variations
- Implements fault detection with confirmation delay
- Auto-isolates on confirmed fault
- Polls and executes commands from backend
- Sends acknowledgements

---

## 🔄 Communication Protocol

### Telemetry (ESP32 → Backend)
```
POST /api/devices/{device_id}/telemetry
Headers: X-Device-API-Key: <key>, Content-Type: application/json

{
  "device_id": "ESP32-POLE-01",
  "timestamp": "2024-01-15T10:30:00Z",
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

Response 200:
{
  "command_id": "uuid",
  "command": "OPEN_RELAY|CLOSE_RELAY|RESET_FAULT|REQUEST_STATUS",
  "parameters": {"relay": "k1", "desired_state": false}
}

Response 204: No pending commands
```

### Command Acknowledgement (ESP32 → Backend)
```
POST /api/devices/{device_id}/command/{command_id}/ack
Headers: X-Device-API-Key: <key>

{
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

### Frontend → Backend → ESP32 (Relay Control)
```
# Frontend calls:
POST /api/relay
{
  "device_id": "ESP32-POLE-01",
  "relay": "k1",
  "desired_state": false,
  "issued_by": "user-uuid"
}

# Backend creates PENDING command → ESP32 polls → executes → ACKs
# Frontend receives real-time updates via WebSocket
```

---

## 🎯 Fault Detection Logic

### State Machine

```
STARTING → HEALTHY ←→ FAULT → ISOLATED
                ↓            ↑
           SENSOR_ERROR ────┘
```

| State | Condition | Indicators |
|-------|-----------|------------|
| STARTING | Boot, sensors stabilizing | Green LED blinking |
| HEALTHY | Voltage & current in range, relay closed | Green LED solid |
| FAULT | Voltage/current out of range (confirmed) | Red LED + Buzzer ON |
| ISOLATED | Relay intentionally open | Red LED solid, Buzzer OFF |
| SENSOR_ERROR | Invalid readings (<0 or >max) | Red LED + Buzzer beeping |

### Debouncing/Hysteresis

- **Fault Confirmation**: Requires sustained abnormal reading for `FAULT_CONFIRM_DELAY_MS` (default 2s)
- **Recovery Confirmation**: Requires sustained normal reading for `FAULT_RECOVERY_DELAY_MS` (default 5s)
- **Relay Hysteresis**: Minimum `MIN_RELAY_SWITCH_INTERVAL_MS` (5s) between switches

---

## 🔐 Security Notes

1. **DEVICE_API_KEY**: Treat like a password. Use a strong random string (32+ chars).
2. **Supabase Service Role Key**: NEVER expose to frontend or ESP32. Server-only.
3. **Frontend**: Only uses Supabase ANON key (safe for browser).
4. **ESP32**: Uses DEVICE_API_KEY for all HTTP requests.
5. **HTTPS**: In production, use HTTPS for all backend communication.
6. **Network**: ESP32 and backend should be on same trusted network.

---

## 🚀 Production Deployment

### Backend (Vercel/Render/Railway/Fly.io)
```bash
# Build
cd backend
pip install -r requirements.txt

# Set environment variables in your platform
# Ensure HARDWARE_MODE=live
```

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy .next folder
```

### ESP32 OTA Updates (Future)
The firmware supports OTA via PlatformIO. For production, implement:
- Signed firmware images
- Secure boot
- Rollback on failure

---

## 🐛 Troubleshooting

### ESP32 Won't Connect to WiFi
- Check SSID/password in firmware
- Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
- Check serial monitor for connection attempts

### Telemetry Not Appearing in Frontend
1. Verify backend `/health` returns `hardware_mode: "live"`
2. Check backend logs for telemetry ingestion
3. Verify `DEVICE_API_KEY` matches in both firmware and backend `.env`
4. Check device exists in Supabase `devices` table
5. Open browser DevTools → Network → WS to see WebSocket messages

### Relay Not Responding to Commands
1. Check relay command in backend: `GET /api/relay_commands?device_id=...`
2. Verify ESP32 is polling `/command` endpoint (serial monitor)
3. Check command ACK in backend logs
4. Verify relay wiring (active-low vs active-high)

### LCD Not Displaying
- Verify I2C address (0x27 or 0x3F - scan with I2C scanner sketch)
- Check SDA/SCL wiring (GPIO21/22)
- Ensure 5V power to LCD

### Sensor Readings Seem Wrong
- ACS712: Adjust `ACS712_VREF` (should be ~1.65V at zero current)
- Voltage sensor: Measure actual voltage with multimeter, adjust `VOLTAGE_CALIBRATION`
- Check `VOLTAGE_DIVIDER_RATIO` matches your module (typically 5:1 for 0-25V)

---

## 📁 File Summary

### New Files Created
```
esp32_firmware/
├── lt_faultx_esp32.ino       # Main ESP32 firmware
├── platformio.ini            # PlatformIO config
├── esp32_simulator.py        # Python simulator for testing
└── README.md                 # Firmware docs

backend/
├── app/api/esp32_routes.py   # ESP32 REST endpoints
├── app/models/__init__.py    # Extended with ESP32 models
├── app/main.py               # Updated to include esp32 router
└── app/config.py             # Added DEVICE_API_KEY

frontend/
├── app/providers.tsx         # HardwareProvider wrapper
├── app/operator/hardware/page.tsx    # Operator hardware monitor
├── app/admin/devices/page.tsx        # Admin device management
├── components/ESP32DeviceCard.tsx    # Live device card component
├── lib/hardware-context.tsx          # WebSocket context + state
├── lib/useHardwareWebSocket.ts       # Standalone hook
├── lib/session-core.ts               # Shared session utilities
└── (updated: layout, operator/page, admin/layout, operator/layout)
```

---

## ✅ Quick Verification Checklist

- [ ] Backend running on port 8000, `/health` returns `hardware_mode: "live"`
- [ ] Frontend running on port 3000, loads without errors
- [ ] ESP32 firmware uploaded, serial shows "WiFi connected"
- [ ] Device registered in Supabase `devices` table
- [ ] `DEVICE_API_KEY` matches in firmware and backend `.env`
- [ ] Telemetry appears in backend logs
- [ ] WebSocket shows `telemetry` events in browser DevTools
- [ ] `/operator/hardware` shows live device card with data
- [ ] Relay control buttons work (Open/Close)
- [ ] Fault simulation: disconnect voltage sensor → fault detected → relay opens
- [ ] Recovery: reconnect sensor → fault clears → relay closes (if auto-recovery)

---

## 📞 Support

If you encounter issues:
1. Check serial monitor on ESP32 for error messages
2. Check backend logs (uvicorn output)
3. Check browser DevTools console and Network tab
4. Verify all environment variables are set correctly
5. Ensure Supabase RLS policies allow the operations

For questions, check the repo issues or contact the development team.

---

**Repository**: https://github.com/VibeLearning26/LT-FaultX