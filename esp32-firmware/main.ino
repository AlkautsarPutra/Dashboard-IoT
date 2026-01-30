/*
 * Smart Poultry ESP32 Firmware v3.0
 * MANUAL CONTROL MODE - Controlled via Dashboard
 * 
 * Features:
 * - Manual ON/OFF control via Supabase
 * - Direction control (Forward/Backward)
 * - Limit switch safety cutoff
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ====== WI-FI CONFIG ======
const char* ssid = "milik Awal";
const char* password = "11111111";

// ====== SUPABASE CONFIG ======
const char* supabase_url = "https://xltfpllfyjxjmwdwocjl.supabase.co";
const char* supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsdGZwbGxmeWp4am13ZHdvY2psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzY5NzIsImV4cCI6MjA4NTI1Mjk3Mn0.6NBKFv320O01EeU3FxY2W-2RsSpruIPx7dSkCgTMSio";

// ====== PIN DEFINITIONS ======
const int PIN_IN1 = 12;  // Auger Motor A
const int PIN_IN2 = 14;  // Auger Motor B
const int PIN_IN3 = 27;  // Konveyor Motor A
const int PIN_IN4 = 26;  // Konveyor Motor B
const int PIN_SENSOR = 4; // Limit Switch (Active LOW)

// ====== MOTOR SPEED SETTINGS ======
int speedAuger = 255;     // Full Speed
int speedKonveyor = 130;  // Slower for conveyor

// ====== STATUS TRACKING ======
unsigned long lastCommandCheck = 0;
unsigned long commandCheckInterval = 1000; // Check commands every 1 second
unsigned long lastStatusUpdate = 0;
unsigned long statusInterval = 3000;

// Motor states
bool augerRunning = false;
bool conveyorRunning = false;
String augerDirection = "FORWARD";    // FORWARD or BACKWARD
String conveyorDirection = "FORWARD"; // FORWARD or BACKWARD

void setup() {
  Serial.begin(115200);
  
  // Initialize Motor Pins
  pinMode(PIN_IN1, OUTPUT);
  pinMode(PIN_IN2, OUTPUT);
  pinMode(PIN_IN3, OUTPUT);
  pinMode(PIN_IN4, OUTPUT);
  
  // Initialize Sensor Pin
  pinMode(PIN_SENSOR, INPUT_PULLUP);
  
  // Stop all motors initially
  stopAllMotors();
  
  Serial.println("=== Smart Poultry v3.0 - MANUAL CONTROL ===");
  Serial.println("Connecting to WiFi...");
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 40) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    logAction("SYSTEM", "ESP32 Connected - Manual Mode");
  } else {
    Serial.println("\nWiFi Failed!");
  }
}

void loop() {
  int sensorState = digitalRead(PIN_SENSOR);
  
  // === SAFETY: Stop motors if limit switch triggered ===
  if (sensorState == LOW) {
    if (augerRunning || conveyorRunning) {
      stopAllMotors();
      augerRunning = false;
      conveyorRunning = false;
      Serial.println("SAFETY STOP - Limit Switch Triggered!");
      logAction("SAFETY", "Motors stopped - Limit switch triggered");
    }
  }
  
  // === CHECK DASHBOARD COMMANDS ===
  if (millis() - lastCommandCheck > commandCheckInterval) {
    if (WiFi.status() == WL_CONNECTED) {
      checkDashboardCommands();
    }
    lastCommandCheck = millis();
  }
  
  // === SEND STATUS UPDATE ===
  if (millis() - lastStatusUpdate > statusInterval) {
    if (WiFi.status() == WL_CONNECTED) {
      sendStatus(sensorState == LOW);
    }
    lastStatusUpdate = millis();
  }
  
  delay(100);
}

// === MOTOR CONTROL FUNCTIONS ===

void runAuger(String direction) {
  if (direction == "FORWARD") {
    digitalWrite(PIN_IN1, HIGH);
    digitalWrite(PIN_IN2, LOW);
    Serial.println("Auger: FORWARD");
  } else {
    digitalWrite(PIN_IN1, LOW);
    digitalWrite(PIN_IN2, HIGH);
    Serial.println("Auger: BACKWARD");
  }
  augerRunning = true;
  augerDirection = direction;
}

void runConveyor(String direction) {
  if (direction == "FORWARD") {
    analogWrite(PIN_IN3, speedKonveyor);
    digitalWrite(PIN_IN4, LOW);
    Serial.println("Conveyor: FORWARD");
  } else {
    analogWrite(PIN_IN3, 0);
    digitalWrite(PIN_IN4, HIGH);
    analogWrite(PIN_IN4, speedKonveyor); // Reverse
    Serial.println("Conveyor: BACKWARD");
  }
  conveyorRunning = true;
  conveyorDirection = direction;
}

void stopAuger() {
  digitalWrite(PIN_IN1, LOW);
  digitalWrite(PIN_IN2, LOW);
  augerRunning = false;
  Serial.println("Auger: STOPPED");
}

void stopConveyor() {
  analogWrite(PIN_IN3, 0);
  digitalWrite(PIN_IN4, LOW);
  conveyorRunning = false;
  Serial.println("Conveyor: STOPPED");
}

void stopAllMotors() {
  stopAuger();
  stopConveyor();
}

// === SUPABASE API FUNCTIONS ===

void checkDashboardCommands() {
  HTTPClient http;
  
  // Get relay commands from Supabase
  String url = String(supabase_url) + "/rest/v1/relays?select=*";
  
  http.begin(url);
  http.addHeader("apikey", supabase_key);
  http.addHeader("Authorization", String("Bearer ") + supabase_key);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    
    // Parse FEEDER command
    if (payload.indexOf("\"type\":\"FEEDER\"") >= 0) {
      int feederStart = payload.indexOf("\"type\":\"FEEDER\"");
      int isOnPos = payload.indexOf("\"is_on\":", feederStart);
      int dirPos = payload.indexOf("\"direction\":", feederStart);
      
      bool feederOn = payload.substring(isOnPos + 8, isOnPos + 12).indexOf("true") >= 0;
      
      String feederDir = "FORWARD";
      if (dirPos > 0) {
        int dirStart = payload.indexOf("\"", dirPos + 12) + 1;
        int dirEnd = payload.indexOf("\"", dirStart);
        if (dirEnd > dirStart) {
          feederDir = payload.substring(dirStart, dirEnd);
        }
      }
      
      if (feederOn && !augerRunning) {
        runAuger(feederDir);
        logAction("FEEDER", "Started - " + feederDir);
      } else if (!feederOn && augerRunning) {
        stopAuger();
        logAction("FEEDER", "Stopped");
      }
    }
    
    // Parse CLEANER command  
    if (payload.indexOf("\"type\":\"CLEANER\"") >= 0) {
      int cleanerStart = payload.indexOf("\"type\":\"CLEANER\"");
      int isOnPos = payload.indexOf("\"is_on\":", cleanerStart);
      int dirPos = payload.indexOf("\"direction\":", cleanerStart);
      
      bool cleanerOn = payload.substring(isOnPos + 8, isOnPos + 12).indexOf("true") >= 0;
      
      String cleanerDir = "FORWARD";
      if (dirPos > 0) {
        int dirStart = payload.indexOf("\"", dirPos + 12) + 1;
        int dirEnd = payload.indexOf("\"", dirStart);
        if (dirEnd > dirStart) {
          cleanerDir = payload.substring(dirStart, dirEnd);
        }
      }
      
      if (cleanerOn && !conveyorRunning) {
        runConveyor(cleanerDir);
        logAction("CLEANER", "Started - " + cleanerDir);
      } else if (!cleanerOn && conveyorRunning) {
        stopConveyor();
        logAction("CLEANER", "Stopped");
      }
    }
  }
  
  http.end();
}

void sendStatus(bool limitTriggered) {
  HTTPClient http;
  
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
  body += "\"motors_running\":" + String((augerRunning || conveyorRunning) ? "true" : "false");
  body += "}";
  
  http.POST(body);
  http.end();
}

void logAction(String type, String message) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(supabase_url) + "/rest/v1/logs";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabase_key);
  http.addHeader("Authorization", String("Bearer ") + supabase_key);
  http.addHeader("Prefer", "return=minimal");
  
  String body = "{\"type\": \"" + type + "\", \"message\": \"" + message + "\"}";
  http.POST(body);
  http.end();
}
