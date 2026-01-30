/*
 * Smart Poultry ESP32 Firmware v3.3
 * Compatible with ESP32 Arduino Core 3.x
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ====== WI-FI CONFIG ======
const char* ssid = "vivo Y22";
const char* password = "lali to?";

// ====== SUPABASE CONFIG ======
const char* supabase_url = "https://xltfpllfyjxjmwdwocjl.supabase.co";
const char* supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdGZwbGxmeWp4am13ZHdvY2psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzY5NzIsImV4cCI6MjA4NTI1Mjk3Mn0.6NBKFv320O01EeU3FxY2W-2RsSpruIPx7dSkCgTMSio";

// ====== PIN DEFINITIONS ======
const int PIN_IN1 = 12;  // Auger Motor A
const int PIN_IN2 = 14;  // Auger Motor B
const int PIN_IN3 = 27;  // Konveyor Motor A
const int PIN_IN4 = 26;  // Konveyor Motor B
const int PIN_SENSOR = 4; // Limit Switch

// ====== MOTOR SPEED ======
int motorSpeed = 255;  // Full speed (0-255)

// ====== STATUS TRACKING ======
unsigned long lastCommandCheck = 0;
unsigned long commandCheckInterval = 500;
unsigned long lastWiFiCheck = 0;
unsigned long lastStatusSend = 0;
unsigned long statusSendInterval = 10000; // Send status every 10 seconds

bool augerOn = false;
bool conveyorOn = false;
String augerDir = "FORWARD";
String conveyorDir = "FORWARD";

int failedRequests = 0;

void setup() {
  Serial.begin(115200);
  
  // Setup PWM using new ESP32 Arduino Core 3.x API
  // ledcAttach(pin, frequency, resolution)
  ledcAttach(PIN_IN1, 1000, 8);  // 1kHz, 8-bit
  ledcAttach(PIN_IN2, 1000, 8);
  ledcAttach(PIN_IN3, 1000, 8);
  ledcAttach(PIN_IN4, 1000, 8);
  
  // Initialize Sensor Pin
  pinMode(PIN_SENSOR, INPUT_PULLUP);
  
  // Stop all motors
  stopAllMotors();
  
  Serial.println("=== Smart Poultry v3.3 ===");
  connectWiFi();
}

void connectWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi Failed!");
  }
}

void loop() {
  int sensorState = digitalRead(PIN_SENSOR);
  
  // Safety stop
  if (sensorState == LOW && (augerOn || conveyorOn)) {
    stopAllMotors();
    augerOn = false;
    conveyorOn = false;
    Serial.println("SAFETY STOP!");
  }
  
  // Check WiFi
  if (millis() - lastWiFiCheck > 5000) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi lost, reconnecting...");
      connectWiFi();
    }
    lastWiFiCheck = millis();
  }
  
  // Check commands
  if (millis() - lastCommandCheck > commandCheckInterval) {
    if (WiFi.status() == WL_CONNECTED) {
      checkCommands();
    }
    lastCommandCheck = millis();
  }
  
  // Send status to dashboard (for online indicator)
  if (millis() - lastStatusSend > statusSendInterval) {
    if (WiFi.status() == WL_CONNECTED) {
      sendStatus(sensorState == LOW);
    }
    lastStatusSend = millis();
  }
  
  // Apply motor states
  applyMotorStates();
  
  delay(50);
}

void applyMotorStates() {
  // === AUGER MOTOR ===
  if (augerOn) {
    if (augerDir == "FORWARD") {
      ledcWrite(PIN_IN1, motorSpeed);
      ledcWrite(PIN_IN2, 0);
    } else {
      ledcWrite(PIN_IN1, 0);
      ledcWrite(PIN_IN2, motorSpeed);
    }
  } else {
    ledcWrite(PIN_IN1, 0);
    ledcWrite(PIN_IN2, 0);
  }
  
  // === CONVEYOR MOTOR ===
  if (conveyorOn) {
    if (conveyorDir == "FORWARD") {
      ledcWrite(PIN_IN3, motorSpeed);
      ledcWrite(PIN_IN4, 0);
    } else {
      ledcWrite(PIN_IN3, 0);
      ledcWrite(PIN_IN4, motorSpeed);
    }
  } else {
    ledcWrite(PIN_IN3, 0);
    ledcWrite(PIN_IN4, 0);
  }
}

void stopAllMotors() {
  ledcWrite(PIN_IN1, 0);
  ledcWrite(PIN_IN2, 0);
  ledcWrite(PIN_IN3, 0);
  ledcWrite(PIN_IN4, 0);
}

void sendStatus(bool limitTriggered) {
  HTTPClient http;
  http.setTimeout(3000);
  
  String url = String(supabase_url) + "/rest/v1/sensor_status";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabase_key);
  http.addHeader("Authorization", String("Bearer ") + supabase_key);
  http.addHeader("Prefer", "return=minimal");
  
  String body = "{";
  body += "\"device_id\":\"esp32_feeder\",";
  body += "\"sensor_name\":\"limit_switch\",";
  body += "\"is_triggered\":" + String(limitTriggered ? "true" : "false") + ",";
  body += "\"motors_running\":" + String((augerOn || conveyorOn) ? "true" : "false");
  body += "}";
  
  int httpCode = http.POST(body);
  if (httpCode > 0) {
    Serial.println("Status sent to dashboard");
  }
  http.end();
}

void checkCommands() {
  HTTPClient http;
  http.setTimeout(3000);
  
  String url = String(supabase_url) + "/rest/v1/relays?select=type,is_on,direction";
  
  http.begin(url);
  http.addHeader("apikey", supabase_key);
  http.addHeader("Authorization", String("Bearer ") + supabase_key);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    failedRequests = 0;
    
    // Parse FEEDER
    int feederIdx = payload.indexOf("FEEDER");
    if (feederIdx >= 0) {
      int start = (feederIdx - 50 < 0) ? 0 : feederIdx - 50;
      String section = payload.substring(start, feederIdx + 50);
      
      bool newState = section.indexOf("\"is_on\":true") >= 0;
      if (newState != augerOn) {
        augerOn = newState;
        Serial.println(augerOn ? "AUGER: ON" : "AUGER: OFF");
      }
      augerDir = (section.indexOf("BACKWARD") >= 0) ? "BACKWARD" : "FORWARD";
    }
    
    // Parse CLEANER
    int cleanerIdx = payload.indexOf("CLEANER");
    if (cleanerIdx >= 0) {
      int start = (cleanerIdx - 50 < 0) ? 0 : cleanerIdx - 50;
      String section = payload.substring(start, cleanerIdx + 50);
      
      bool newState = section.indexOf("\"is_on\":true") >= 0;
      if (newState != conveyorOn) {
        conveyorOn = newState;
        Serial.println(conveyorOn ? "CONVEYOR: ON" : "CONVEYOR: OFF");
      }
      conveyorDir = (section.indexOf("BACKWARD") >= 0) ? "BACKWARD" : "FORWARD";
    }
    
  } else {
    failedRequests++;
    if (failedRequests >= 5) {
      WiFi.disconnect();
      delay(1000);
      connectWiFi();
      failedRequests = 0;
    }
  }
  
  http.end();
}
