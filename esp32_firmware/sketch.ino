#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <math.h>

// =====================================================
// LT-FAULTX — WOKWI + CLOUDFLARE (NON-BLOCKING)
// =====================================================

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* BACKEND_BASE_URL = "https://distant-attendance-affect-resulting.trycloudflare.com";
const char* DEVICE_ID = "ESP32-POLE-01";
const char* DEVICE_API_KEY = "f7a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5";
const char* FIRMWARE_VERSION = "1.0.0-wokwi";

const int VOLTAGE_PIN = 34;
const int CURRENT_PIN = 35;
const int RELAY_IN1 = 5;
const int RELAY_IN2 = 18;
const int GREEN_LED = 25;
const int RED_LED = 26;
const int BUZZER_PIN = 4;
const int FAULT_BUTTON = 27;
const int RESET_BUTTON = 14;
const int SDA_PIN = 21;
const int SCL_PIN = 22;

LiquidCrystal_I2C lcd(0x27, 16, 2);

const bool RELAY_ACTIVE_LOW = true;
const float ADC_REFERENCE = 3.3;
const int ADC_MAX = 4095;
const float VOLTAGE_RATIO = 5.0;
const float ACS712_SENSITIVITY = 0.185;
float ACS712_ZERO = 2.50;

const float FAULT_VOLTAGE = 2.0;
const unsigned long FAULT_CONFIRM_TIME = 200;  // Faster fault confirmation

bool lineFault = false;
unsigned long lowVoltageStart = 0;
unsigned long lastDisplayUpdate = 0;
const unsigned long DISPLAY_INTERVAL = 200;  // Fast LCD updates
unsigned long bootTime = 0;
unsigned long sequenceNumber = 0;
int wifiRssi = 0;
bool wifiConnected = false;

// Non-blocking sensor state
float voltage = 0;
float current = 0;
unsigned long lastSample = 0;
int sampleCount = 0;
long voltSum = 0;
long currSum = 0;

// Telemetry state
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 5000;
unsigned long lastCommandPollTime = 0;
const unsigned long COMMAND_POLL_INTERVAL = 3000;

void setRelay1(bool state) {
    if (RELAY_ACTIVE_LOW) {
        digitalWrite(RELAY_IN1, state ? LOW : HIGH);
    } else {
        digitalWrite(RELAY_IN1, state ? HIGH : LOW);
    }
}

// Non-blocking: call every loop, accumulates one sample per call
void updateSensors() {
    voltSum += analogRead(VOLTAGE_PIN);
    currSum += analogRead(CURRENT_PIN);
    sampleCount++;
    if (sampleCount >= 10) {  // Faster: compute every 10 samples (~10ms)
        float vRaw = voltSum / 10.0;
        float cRaw = currSum / 10.0;
        voltage = (vRaw / ADC_MAX) * ADC_REFERENCE * VOLTAGE_RATIO;
        float cVolt = (cRaw / ADC_MAX) * ADC_REFERENCE;
        current = (cVolt - ACS712_ZERO) / ACS712_SENSITIVITY;
        if (current < 0) current = 0;
        if (current < 0.03) current = 0;
        voltSum = 0;
        currSum = 0;
        sampleCount = 0;
    }
}

void displayHealthy(float voltage, float current) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("LINE: HEALTHY");
    lcd.setCursor(0, 1);
    lcd.print(voltage, 1);
    lcd.print("V ");
    lcd.print(current, 2);
    lcd.print("A");
}

void displayFault(float voltage, float current) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("LINE BREAK!");
    lcd.setCursor(0, 1);
    lcd.print(voltage, 1);
    lcd.print("V ");
    lcd.print(current, 2);
    lcd.print("A");
}

void enterHealthyState() {
    lineFault = false;
    lowVoltageStart = 0;
    setRelay1(true);
    digitalWrite(GREEN_LED, HIGH);
    digitalWrite(RED_LED, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("LT-FAULTX");
    lcd.setCursor(0, 1);
    lcd.print("LINE HEALTHY");
    Serial.println("LINE HEALTHY | RELAY: ON");
}

void enterFaultState() {
    if (lineFault) return;
    lineFault = true;
    setRelay1(false);
    digitalWrite(GREEN_LED, LOW);
    digitalWrite(RED_LED, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("LINE BREAK!");
    lcd.setCursor(0, 1);
    lcd.print("ISOLATED");
    Serial.println("LINE BREAK DETECTED | LINE ISOLATED");
}

String getISOTime() {
    unsigned long seconds = (millis() - bootTime) / 1000;
    unsigned long hours = seconds / 3600;
    unsigned long minutes = (seconds % 3600) / 60;
    unsigned long secs = seconds % 60;
    char buf[32];
    sprintf(buf, "2026-08-29T%02lu:%02lu:%02luZ", hours, minutes, secs);
    return String(buf);
}

void setupWiFi() {
    Serial.print("Connecting to WiFi: ");
    Serial.println(WIFI_SSID);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Connecting WiFi");

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
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("WiFi Connected");
        lcd.setCursor(0, 1);
        lcd.print(WiFi.localIP().toString().substring(0, 16));
        delay(1000);
    } else {
        wifiConnected = false;
        Serial.println("\nWiFi connection failed!");
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("WiFi Failed!");
        delay(2000);
    }
}

void sendTelemetry() {
    if (!wifiConnected || WiFi.status() != WL_CONNECTED) return;

    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    String url = String(BACKEND_BASE_URL) + "/api/devices/" + DEVICE_ID + "/telemetry";
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-API-Key", DEVICE_API_KEY);
    http.setTimeout(5000);

    StaticJsonDocument<512> doc;
    doc["device_id"] = DEVICE_ID;
    doc["timestamp"] = getISOTime();
    doc["voltage_post_2"] = round(voltage * 100) / 100.0;
    doc["current"] = round(current * 1000) / 1000.0;
    doc["line_status"] = lineFault ? "FAULT" : "HEALTHY";
    doc["relay_state"] = !lineFault;
    doc["green_led"] = !lineFault;
    doc["red_led"] = lineFault;
    doc["buzzer"] = lineFault;
    doc["load_1"] = !lineFault;
    doc["load_2"] = !lineFault;
    doc["wifi_rssi"] = wifiRssi;
    doc["uptime_seconds"] = (millis() - bootTime) / 1000;
    doc["firmware_version"] = FIRMWARE_VERSION;
    doc["sequence_number"] = sequenceNumber++;

    String payload;
    serializeJson(doc, payload);

    int httpCode = http.POST(payload);
    if (httpCode > 0) {
        if (httpCode == 200 || httpCode == 201) {
            Serial.printf("[TELEMETRY] Sent OK: V=%.2fV I=%.3fA %s\n",
                          voltage, current, lineFault ? "FAULT" : "HEALTHY");
        } else {
            Serial.printf("[TELEMETRY] Failed: HTTP %d\n", httpCode);
        }
    } else {
        Serial.printf("[TELEMETRY] HTTP error: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
}

void pollCommands() {
    if (!wifiConnected || WiFi.status() != WL_CONNECTED) return;

    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    String url = String(BACKEND_BASE_URL) + "/api/devices/" + DEVICE_ID + "/command";
    http.begin(client, url);
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
            if (commandId.length() > 0 && command.length() > 0) {
                Serial.printf("[COMMAND] Received: %s (%s)\n", command.c_str(), commandId.c_str());
                bool executed = false;
                if (command == "OPEN_RELAY") { setRelay1(false); executed = true; }
                else if (command == "CLOSE_RELAY") { setRelay1(true); executed = true; }
                else if (command == "RESET_FAULT") { enterHealthyState(); executed = true; }
                else if (command == "REQUEST_STATUS") { sendTelemetry(); executed = true; }

                HTTPClient ackHttp;
                String ackUrl = String(BACKEND_BASE_URL) + "/api/devices/" + DEVICE_ID + "/command/" + commandId + "/ack";
                WiFiClientSecure ackClient;
                ackClient.setInsecure();
                ackHttp.begin(ackClient, ackUrl);
                ackHttp.addHeader("Content-Type", "application/json");
                ackHttp.addHeader("X-Device-API-Key", DEVICE_API_KEY);
                StaticJsonDocument<256> ackDoc;
                ackDoc["command_id"] = commandId;
                ackDoc["status"] = executed ? "ACKNOWLEDGED" : "FAILED";
                ackDoc["result_state"] = executed;
                ackDoc["message"] = executed ? "Command executed" : "Command failed";
                String ackPayload;
                serializeJson(ackDoc, ackPayload);
                ackHttp.POST(ackPayload);
                ackHttp.end();
            }
        }
    }
    http.end();
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    pinMode(RELAY_IN1, OUTPUT);
    pinMode(RELAY_IN2, OUTPUT);
    pinMode(GREEN_LED, OUTPUT);
    pinMode(RED_LED, OUTPUT);
    pinMode(BUZZER_PIN, OUTPUT);
    pinMode(FAULT_BUTTON, INPUT_PULLUP);
    pinMode(RESET_BUTTON, INPUT_PULLUP);
    analogReadResolution(12);

    Wire.begin(SDA_PIN, SCL_PIN);
    lcd.init();
    lcd.backlight();

    if (RELAY_ACTIVE_LOW) {
        digitalWrite(RELAY_IN2, HIGH);
    } else {
        digitalWrite(RELAY_IN2, LOW);
    }

    bootTime = millis();

    setupWiFi();
    enterHealthyState();

    Serial.println("SYSTEM READY");
}

void loop() {
    unsigned long now = millis();

    // === CHECK BUTTONS (always first) ===
    if (digitalRead(FAULT_BUTTON) == LOW) { enterFaultState(); delay(200); return; }
    if (digitalRead(RESET_BUTTON) == LOW) { enterHealthyState(); delay(200); return; }

    // === NON-BLOCKING SENSOR UPDATE ===
    updateSensors();

    // === FAULT DETECTION ===
    if (!lineFault && voltage < FAULT_VOLTAGE) {
        if (lowVoltageStart == 0) lowVoltageStart = now;
        if (now - lowVoltageStart >= FAULT_CONFIRM_TIME) {
            enterFaultState();
            lowVoltageStart = 0;
        }
    } else if (voltage >= FAULT_VOLTAGE) {
        lowVoltageStart = 0;
    }

    // === CHECK BUTTONS AGAIN (before blocking ops) ===
    if (digitalRead(FAULT_BUTTON) == LOW) { enterFaultState(); delay(200); return; }
    if (digitalRead(RESET_BUTTON) == LOW) { enterHealthyState(); delay(200); return; }

    // === TELEMETRY (blocking) ===
    if (now - lastTelemetryTime >= TELEMETRY_INTERVAL) {
        lastTelemetryTime = now;
        sendTelemetry();
    }

    // === CHECK BUTTONS AGAIN (after telemetry) ===
    if (digitalRead(FAULT_BUTTON) == LOW) { enterFaultState(); delay(200); return; }
    if (digitalRead(RESET_BUTTON) == LOW) { enterHealthyState(); delay(200); return; }

    // === COMMAND POLLING (blocking) ===
    if (now - lastCommandPollTime >= COMMAND_POLL_INTERVAL) {
        lastCommandPollTime = now;
        pollCommands();
    }

    // === LCD UPDATE ===
    if (now - lastDisplayUpdate >= DISPLAY_INTERVAL) {
        lastDisplayUpdate = now;
        if (lineFault) displayFault(voltage, current);
        else displayHealthy(voltage, current);
    }

    delay(1);
}
