/**
 * ESP32 Firmware for LT-FaultX Line Break Detection Prototype
 * 
 * Hardware:
 * - ESP32-WROOM-32 / ESP-32S
 * - ACS712 Current Sensor on GPIO35 (ADC1_CH7)
 * - Voltage Sensor (0-25V module) on GPIO34 (ADC1_CH6)
 * - 5V Relay Module (controls line isolation)
 * - Green LED (healthy), Red LED (fault), Buzzer (audible fault)
 * - Character LCD with I2C backpack (local display)
 * - 2x 12V LED Loads (represent line loads)
 * 
 * Communication:
 * - WiFi to backend (HTTP REST + periodic polling for commands)
 * - Device API Key authentication (X-Device-API-Key header)
 * - Telemetry POST to /api/devices/{device_id}/telemetry
 * - Command polling GET /api/devices/{device_id}/command
 * - Command ACK POST /api/devices/{device_id}/command/{command_id}/ack
 * - Config fetch GET /api/devices/{device_id}/config
 * 
 * Fault Detection:
 * - Uses voltage at Post 2 + current measurement
 * - Configurable thresholds with hysteresis/debouncing
 * - Local operation continues even without backend connectivity
 * 
 * Safety:
 * - Never executes unknown commands
 * - Relay commands are explicit (OPEN_RELAY, CLOSE_RELAY, RESET_FAULT)
 * - Local fault detection continues during network outage
 * - Relay hysteresis prevents chatter
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ==================== CONFIGURATION ====================
// WiFi
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend
const char* BACKEND_BASE_URL = "http://192.168.1.100:8000";  // Change to your backend IP
const char* DEVICE_ID = "ESP32-POLE-01";
const char* DEVICE_API_KEY = "YOUR_DEVICE_API_KEY";  // Must match backend DEVICE_API_KEY
const char* FIRMWARE_VERSION = "1.0.0";

// Hardware Pins
const int PIN_CURRENT_SENSOR = 35;    // ACS712 on ADC1_CH7
const int PIN_VOLTAGE_SENSOR = 34;    // Voltage sensor on ADC1_CH6
const int PIN_RELAY = 25;             // Relay control
const int PIN_GREEN_LED = 26;         // Green LED - healthy
const int PIN_RED_LED = 27;           // Red LED - fault
const int PIN_BUZZER = 14;            // Buzzer
const int PIN_LOAD_1 = 12;            // Load 1 indicator/control
const int PIN_LOAD_2 = 13;            // Load 2 indicator/control
const int PIN_I2C_SDA = 21;           // LCD I2C SDA
const int PIN_I2C_SCL = 22;           // LCD I2C SCL

// LCD Configuration
const int LCD_ADDR = 0x27;            // Typical I2C address
const int LCD_COLS = 16;
const int LCD_ROWS = 2;

// ADC Configuration
const float ADC_VREF = 3.3;
const int ADC_RESOLUTION = 4095;      // 12-bit ADC

// ACS712 Calibration (adjust for your module: 5A, 20A, or 30A version)
const float ACS712_SENSITIVITY = 0.185;  // V/A for 5A version (185mV/A)
const float ACS712_VREF = 1.65;          // Zero-current output voltage (VCC/2)
const int ACS712_SAMPLES = 100;          // Samples for averaging

// Voltage Sensor Calibration (0-25V module, typically 5:1 divider)
const float VOLTAGE_DIVIDER_RATIO = 5.0;  // Input:Output ratio
const float VOLTAGE_CALIBRATION = 1.0;    // Fine-tune multiplier

// Fault Detection Thresholds (CONFIGURABLE - can be overridden by backend config)
float MIN_HEALTHY_VOLTAGE = 10.0;      // V - below this = fault
float MAX_HEALTHY_VOLTAGE = 28.0;      // V - above this = fault
float MIN_HEALTHY_CURRENT = 0.05;      // A - below this = possible fault
float FAULT_CONFIRM_DELAY_MS = 2000;   // ms - confirm fault after this duration
float FAULT_RECOVERY_DELAY_MS = 5000;  // ms - confirm recovery after this duration
int TELEMETRY_INTERVAL_MS = 1000;      // ms - telemetry send interval
bool AUTO_ISOLATION_ENABLED = true;    // Auto-open relay on confirmed fault
bool BUZZER_ENABLED = true;            // Enable buzzer on fault

// Relay Safety
const int MIN_RELAY_SWITCH_INTERVAL_MS = 5000;  // Minimum time between relay switches

// ==================== STATE ====================
enum LineState {
  STARTING,
  HEALTHY,
  FAULT,
  ISOLATED,
  SENSOR_ERROR
};

LineState currentLineState = STARTING;
LineState previousLineState = STARTING;
unsigned long stateChangeTime = 0;
bool relayState = true;  // true = CLOSED (line connected), false = OPEN (isolated)
int relayCommand = 0;    // 0 = none, 1 = open, 2 = close, 3 = reset_fault
unsigned long lastRelaySwitchTime = 0;
unsigned long lastTelemetryTime = 0;
unsigned long lastCommandPollTime = 0;
unsigned long lastConfigFetchTime = 0;
unsigned long sequenceNumber = 0;
unsigned long bootTime = 0;

// Sensor readings (filtered)
float currentVoltage = 0;
float currentCurrent = 0;
float filteredVoltage = 0;
float filteredCurrent = 0;
int wifiRssi = 0;

// LCD
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);

// WiFi/HTTP
bool wifiConnected = false;
unsigned long lastWifiCheck = 0;

// ==================== FUNCTION DECLARATIONS ====================
void setupWiFi();
void sendTelemetry();
void pollCommands();
void fetchConfig();
bool executeCommand(const String& commandId, const String& command, JsonObject params);
void acknowledgeCommand(const String& commandId, const String& status, bool resultState, const String& message);
void updateIndicators();
void updateLCD();
void readSensors();
LineState evaluateLineState(float voltage, float current);
void applyRelayState(bool newState);
void handleFaultDetection(LineState newState);
void loadConfigFromBackend(JsonObject config);
String getStateString(LineState state);

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n=== LT-FaultX ESP32 Firmware ===");
  Serial.printf("Device ID: %s\n", DEVICE_ID);
  Serial.printf("Firmware: %s\n", FIRMWARE_VERSION);
  
  bootTime = millis();
  
  // Pin modes
  pinMode(PIN_CURRENT_SENSOR, INPUT);
  pinMode(PIN_VOLTAGE_SENSOR, INPUT);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_GREEN_LED, OUTPUT);
  pinMode(PIN_RED_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LOAD_1, OUTPUT);
  pinMode(PIN_LOAD_2, OUTPUT);
  
  // Initial relay state (CLOSED = line connected)
  // Relay module is active-LOW: HIGH = OFF/OPEN, LOW = ON/CLOSED
  digitalWrite(PIN_RELAY, HIGH);  // Start with relay OPEN (safe state)
  relayState = false;  // Track actual relay contact state: false = OPEN, true = CLOSED
  
  // Initial LED states
  digitalWrite(PIN_GREEN_LED, LOW);
  digitalWrite(PIN_RED_LED, LOW);
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LOAD_1, LOW);  // Loads OFF when relay is open
  digitalWrite(PIN_LOAD_2, LOW);
  
  // Initialize LCD
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("LT-FaultX Boot");
  lcd.setCursor(0, 1);
  lcd.print(DEVICE_ID);
  
  // Connect WiFi
  setupWiFi();
  
  // Fetch initial config
  fetchConfig();
  
  Serial.println("Setup complete");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Ready");
  lcd.setCursor(0, 1);
  lcd.print("Monitoring...");
}

// ==================== MAIN LOOP ====================
void loop() {
  unsigned long now = millis();
  
  // Read sensors continuously
  readSensors();
  
  // Evaluate line state
  LineState newState = evaluateLineState(filteredVoltage, filteredCurrent);
  handleFaultDetection(newState);
  
  // Update local indicators (always, even without WiFi)
  updateIndicators();
  updateLCD();
  
  // WiFi maintenance
  if (now - lastWifiCheck > 10000) {
    lastWifiCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      wifiConnected = false;
      Serial.println("WiFi disconnected, reconnecting...");
      setupWiFi();
    } else if (!wifiConnected) {
      wifiConnected = true;
      Serial.println("WiFi reconnected");
    }
  }
  
  // Send telemetry
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    if (wifiConnected) {
      sendTelemetry();
    }
    lastTelemetryTime = now;
  }
  
  // Poll for commands from backend
  if (now - lastCommandPollTime >= 2000) {  // Poll every 2s
    if (wifiConnected) {
      pollCommands();
    }
    lastCommandPollTime = now;
  }
  
  // Fetch config periodically
  if (now - lastConfigFetchTime >= 60000) {  // Every 60s
    if (wifiConnected) {
      fetchConfig();
    }
    lastConfigFetchTime = now;
  }
  
  // Handle pending relay commands
  if (relayCommand != 0 && now - lastRelaySwitchTime >= MIN_RELAY_SWITCH_INTERVAL_MS) {
    switch (relayCommand) {
      case 1: applyRelayState(false); break;  // OPEN_RELAY
      case 2: applyRelayState(true); break;   // CLOSE_RELAY
      case 3: currentLineState = HEALTHY; stateChangeTime = now; break;  // RESET_FAULT
    }
    relayCommand = 0;
    lastRelaySwitchTime = now;
  }
  
  delay(50);  // Small delay to prevent watchdog issues
}

// ==================== WIFI ====================
void setupWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    wifiRssi = WiFi.RSSI();
    Serial.println("\nWiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("RSSI: ");
    Serial.println(wifiRssi);
  } else {
    wifiConnected = false;
    Serial.println("\nWiFi connection failed!");
  }
}

// ==================== SENSORS ====================
void readSensors() {
  // Read ACS712 current sensor (average multiple samples)
  long currentSum = 0;
  for (int i = 0; i < ACS712_SAMPLES; i++) {
    currentSum += analogRead(PIN_CURRENT_SENSOR);
    delayMicroseconds(50);
  }
  float avgCurrentRaw = (float)currentSum / ACS712_SAMPLES;
  float currentVoltageSensor = (avgCurrentRaw / ADC_RESOLUTION) * ADC_VREF;
  currentCurrent = (currentVoltageSensor - ACS712_VREF) / ACS712_SENSITIVITY;
  if (currentCurrent < 0) currentCurrent = 0;
  
  // Read voltage sensor
  int voltageRaw = analogRead(PIN_VOLTAGE_SENSOR);
  float voltageSensor = (voltageRaw / ADC_RESOLUTION) * ADC_VREF;
  currentVoltage = voltageSensor * VOLTAGE_DIVIDER_RATIO * VOLTAGE_CALIBRATION;
  
  // Simple exponential moving average filter
  const float ALPHA = 0.1;
  filteredVoltage = ALPHA * currentVoltage + (1 - ALPHA) * filteredVoltage;
  filteredCurrent = ALPHA * currentCurrent + (1 - ALPHA) * filteredCurrent;
  
  // Update WiFi RSSI
  if (wifiConnected) {
    wifiRssi = WiFi.RSSI();
  }
}

// ==================== FAULT DETECTION LOGIC ====================
LineState evaluateLineState(float voltage, float current) {
  // Check for sensor errors (obviously invalid readings)
  if (voltage < 0 || voltage > 30 || current < 0 || current > 10) {
    return SENSOR_ERROR;
  }
  
  // Check voltage thresholds
  bool voltageOk = (voltage >= MIN_HEALTHY_VOLTAGE && voltage <= MAX_HEALTHY_VOLTAGE);
  bool currentOk = (current >= MIN_HEALTHY_CURRENT);
  
  // Line is healthy if both voltage and current are within expected ranges
  // AND relay is closed (line connected)
  if (voltageOk && currentOk && relayState) {
    return HEALTHY;
  }
  
  // If relay is intentionally open, line is isolated
  if (!relayState) {
    return ISOLATED;
  }
  
  // Otherwise fault (voltage or current out of range while relay closed)
  return FAULT;
}

void handleFaultDetection(LineState newState) {
  unsigned long now = millis();
  
  if (newState != currentLineState) {
    // State changed - start confirmation timer
    currentLineState = newState;
    stateChangeTime = now;
    Serial.printf("Line state changed to: %s\n", getStateString(newState).c_str());
  } else {
    // Same state - check if confirmation delay has passed
    if (currentLineState == FAULT && (now - stateChangeTime >= FAULT_CONFIRM_DELAY_MS)) {
      // Confirmed fault - trigger auto-isolation if enabled
      if (AUTO_ISOLATION_ENABLED && relayState) {
        Serial.println("AUTO-ISOLATION: Opening relay due to confirmed fault");
        applyRelayState(false);
      }
    } else if (currentLineState == HEALTHY && (now - stateChangeTime >= FAULT_RECOVERY_DELAY_MS)) {
      // Confirmed recovery - auto-close relay if it was opened due to fault
      if (!relayState && previousLineState == FAULT) {
        Serial.println("AUTO-RECOVERY: Closing relay after fault cleared");
        applyRelayState(true);
      }
    }
  }
  
  previousLineState = currentLineState;
}

// ==================== RELAY CONTROL ====================
void applyRelayState(bool newState) {
  if (newState == relayState) return;  // No change needed
  
  unsigned long now = millis();
  if (now - lastRelaySwitchTime < MIN_RELAY_SWITCH_INTERVAL_MS) {
    Serial.println("Relay switch rate limited");
    return;
  }
  
  relayState = newState;
  digitalWrite(PIN_RELAY, relayState ? HIGH : LOW);  // Active-low relay
  lastRelaySwitchTime = now;
  
  Serial.printf("Relay %s\n", relayState ? "CLOSED" : "OPEN");
  
  // Send immediate telemetry update
  if (wifiConnected) {
    sendTelemetry();
  }
}

// ==================== INDICATORS ====================
void updateIndicators() {
  switch (currentLineState) {
    case HEALTHY:
      digitalWrite(PIN_GREEN_LED, HIGH);
      digitalWrite(PIN_RED_LED, LOW);
      digitalWrite(PIN_BUZZER, LOW);
      break;
    case FAULT:
      digitalWrite(PIN_GREEN_LED, LOW);
      digitalWrite(PIN_RED_LED, HIGH);
      if (BUZZER_ENABLED) digitalWrite(PIN_BUZZER, HIGH);
      break;
    case ISOLATED:
      digitalWrite(PIN_GREEN_LED, LOW);
      digitalWrite(PIN_RED_LED, HIGH);
      digitalWrite(PIN_BUZZER, LOW);
      break;
    case SENSOR_ERROR:
      digitalWrite(PIN_GREEN_LED, LOW);
      digitalWrite(PIN_RED_LED, HIGH);
      if (BUZZER_ENABLED) {
        // Beep pattern for sensor error
        digitalWrite(PIN_BUZZER, (millis() / 500) % 2);
      }
      break;
    case STARTING:
    default:
      digitalWrite(PIN_GREEN_LED, (millis() / 500) % 2);
      digitalWrite(PIN_RED_LED, LOW);
      digitalWrite(PIN_BUZZER, LOW);
      break;
  }
  
  // Load indicators (show actual load state)
  digitalWrite(PIN_LOAD_1, relayState ? HIGH : LOW);
  digitalWrite(PIN_LOAD_2, relayState ? HIGH : LOW);
}

void updateLCD() {
  static unsigned long lastLcdUpdate = 0;
  if (millis() - lastLcdUpdate < 1000) return;  // Update LCD at most once per second
  lastLcdUpdate = millis();
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(getStateString(currentLineState));
  lcd.print(" V:");
  lcd.print(filteredVoltage, 1);
  
  lcd.setCursor(0, 1);
  lcd.print("I:");
  lcd.print(filteredCurrent, 2);
  lcd.print("A R:");
  lcd.print(relayState ? "CLOSED" : "OPEN");
}

// ==================== COMMUNICATION ====================
void sendTelemetry() {
  if (!wifiConnected) return;
  
  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/api/devices/" + DEVICE_ID + "/telemetry";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-API-Key", DEVICE_API_KEY);
  http.setTimeout(5000);
  
  // Build JSON payload
  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = getISOTime();
  doc["voltage_post_2"] = round(filteredVoltage * 100) / 100.0;
  doc["current"] = round(filteredCurrent * 100) / 100.0;
  doc["line_status"] = getStateString(currentLineState);
  doc["relay_state"] = relayState;
  doc["green_led"] = digitalRead(PIN_GREEN_LED) == HIGH;
  doc["red_led"] = digitalRead(PIN_RED_LED) == HIGH;
  doc["buzzer"] = digitalRead(PIN_BUZZER) == HIGH;
  doc["load_1"] = digitalRead(PIN_LOAD_1) == HIGH;
  doc["load_2"] = digitalRead(PIN_LOAD_2) == HIGH;
  doc["wifi_rssi"] = wifiRssi;
  doc["uptime_seconds"] = (millis() - bootTime) / 1000;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["sequence_number"] = sequenceNumber++;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode > 0) {
    if (httpCode == 200 || httpCode == 201) {
      Serial.println("Telemetry sent OK");
    } else {
      Serial.printf("Telemetry failed: %d\n", httpCode);
      String response = http.getString();
      Serial.println(response);
    }
  } else {
    Serial.printf("Telemetry HTTP error: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

void pollCommands() {
  if (!wifiConnected) return;
  
  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/api/devices/" + DEVICE_ID + "/command";
  
  http.begin(url);
  http.addHeader("X-Device-API-Key", DEVICE_API_KEY);
  http.setTimeout(5000);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (!err) {
      String commandId = doc["command_id"] | "";
      String command = doc["command"] | "";
      JsonObject params = doc["parameters"] | JsonObject();
      
      if (commandId.length() > 0 && command.length() > 0) {
        Serial.printf("Received command: %s (%s)\n", command.c_str(), commandId.c_str());
        bool executed = executeCommand(commandId, command, params);
        acknowledgeCommand(commandId, executed ? "ACKNOWLEDGED" : "FAILED", executed, 
                          executed ? "Command executed" : "Command failed");
      }
    }
  } else if (httpCode == 204) {
    // No pending commands - normal
  } else {
    Serial.printf("Command poll failed: %d\n", httpCode);
  }
  
  http.end();
}

bool executeCommand(const String& commandId, const String& command, JsonObject params) {
  Serial.printf("Executing command: %s\n", command.c_str());
  
  if (command == "OPEN_RELAY") {
    relayCommand = 1;
    return true;
  } else if (command == "CLOSE_RELAY") {
    relayCommand = 2;
    return true;
  } else if (command == "RESET_FAULT") {
    relayCommand = 3;
    return true;
  } else if (command == "REQUEST_STATUS") {
    // Just send telemetry immediately
    sendTelemetry();
    return true;
  } else {
    Serial.printf("Unknown command: %s\n", command.c_str());
    return false;
  }
}

void acknowledgeCommand(const String& commandId, const String& status, bool resultState, const String& message) {
  if (!wifiConnected) return;
  
  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/api/devices/" + DEVICE_ID + "/command/" + commandId + "/ack";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-API-Key", DEVICE_API_KEY);
  http.setTimeout(5000);
  
  StaticJsonDocument<256> doc;
  doc["command_id"] = commandId;
  doc["status"] = status;
  doc["result_state"] = resultState;
  doc["message"] = message;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode > 0) {
    Serial.printf("Command ACK sent: %d\n", httpCode);
  } else {
    Serial.printf("Command ACK failed: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

void fetchConfig() {
  if (!wifiConnected) return;
  
  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/api/devices/" + DEVICE_ID + "/config";
  
  http.begin(url);
  http.addHeader("X-Device-API-Key", DEVICE_API_KEY);
  http.setTimeout(5000);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<1024> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (!err) {
      loadConfigFromBackend(doc.as<JsonObject>());
      Serial.println("Config loaded from backend");
    }
  }
  
  http.end();
}

void loadConfigFromBackend(JsonObject config) {
  if (config.containsKey("voltage_fault_threshold")) {
    float val = config["voltage_fault_threshold"] | MIN_HEALTHY_VOLTAGE;
    if (val > 0) MIN_HEALTHY_VOLTAGE = val;
  }
  if (config.containsKey("voltage_calibration")) {
    float val = config["voltage_calibration"] | VOLTAGE_CALIBRATION;
    if (val > 0) VOLTAGE_CALIBRATION = val;
  }
  if (config.containsKey("current_warning_threshold")) {
    float val = config["current_warning_threshold"] | MIN_HEALTHY_CURRENT;
    if (val > 0) MIN_HEALTHY_CURRENT = val;
  }
  if (config.containsKey("fault_debounce_ms")) {
    int val = config["fault_debounce_ms"] | FAULT_CONFIRM_DELAY_MS;
    if (val >= 0) FAULT_CONFIRM_DELAY_MS = val;
  }
  if (config.containsKey("telemetry_interval_ms")) {
    int val = config["telemetry_interval_ms"] | TELEMETRY_INTERVAL_MS;
    if (val >= 100) TELEMETRY_INTERVAL_MS = val;
  }
  if (config.containsKey("auto_isolation_enabled")) {
    AUTO_ISOLATION_ENABLED = config["auto_isolation_enabled"] | AUTO_ISOLATION_ENABLED;
  }
  if (config.containsKey("buzzer_enabled")) {
    BUZZER_ENABLED = config["buzzer_enabled"] | BUZZER_ENABLED;
  }
  
  Serial.println("Configuration updated from backend");
}

// ==================== UTILITIES ====================
String getISOTime() {
  // Simple ISO time - in production use NTP or backend time
  unsigned long seconds = (millis() - bootTime) / 1000;
  unsigned long hours = seconds / 3600;
  unsigned long minutes = (seconds % 3600) / 60;
  unsigned long secs = seconds % 60;
  
  char buf[32];
  sprintf(buf, "2024-01-01T%02lu:%02lu:%02luZ", hours, minutes, secs);
  return String(buf);
}

String getStateString(LineState state) {
  switch (state) {
    case HEALTHY: return "HEALTHY";
    case FAULT: return "FAULT";
    case ISOLATED: return "ISOLATED";
    case SENSOR_ERROR: return "SENSOR_ERR";
    case STARTING:
    default: return "STARTING";
  }
}