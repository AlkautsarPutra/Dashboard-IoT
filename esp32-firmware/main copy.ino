#include <WiFi.h>
#include <HTTPClient.h>
#include <Arduino_JSON.h>

// ====== WI-FI CONFIG ======
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ====== SUPABASE CONFIG ======
// WARNING: Use HTTP (not HTTPS) if you don't want to deal with Root CA certificates on ESP32, 
// OR ensure you use WiFiClientSecure with a certificate.
// For simplicity in this example, we use the REST URL directly.
const char* supabase_url = "YOUR_SUPABASE_URL"; 
const char* supabase_key = "YOUR_SUPABASE_ANON_KEY";

// ====== PINOUT (From User Code) ======
// Channel A = Feeder (Auger)
const int FEED_IN1 = 26; 
const int FEED_IN2 = 27; 
const int FEED_EN  = 23; 

// Channel B = Cleaner (Conveyor)
const int CLEAN_IN3 = 12; 
const int CLEAN_IN4 = 13; 
const int CLEAN_EN  = 14; 

// Sensors
const int LIMIT_PIN = 4; // Active LOW
const int TEMP_PIN = 15; // Changed from 4 to avoid conflict

// ====== SETTINGS ======
const int PWM_SPEED = 255;
const unsigned long FEED_DURATION_MS = 6000;
const unsigned long CLEAN_DURATION_MS = 6000;

// Timer
unsigned long lastCheckTime = 0;
unsigned long checkInterval = 2000; // Check commands every 2s

void setup() {
  Serial.begin(115200);

  // Initialize Pins
  pinMode(FEED_IN1, OUTPUT);
  pinMode(FEED_IN2, OUTPUT);
  pinMode(FEED_EN, OUTPUT);
  
  pinMode(CLEAN_IN3, OUTPUT);
  pinMode(CLEAN_IN4, OUTPUT);
  pinMode(CLEAN_EN, OUTPUT);

  pinMode(LIMIT_PIN, INPUT_PULLUP);

  stopAll();

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while(WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi");
}

void loop() {
  if ((millis() - lastCheckTime) > checkInterval) {
    if(WiFi.status() == WL_CONNECTED) {
      checkRemoteCommands();
      // Optional: Send Sensor Data every X seconds (not every loop)
      // sendSensorData(); 
    }
    lastCheckTime = millis();
  }
}

void stopAll() {
  digitalWrite(FEED_IN1, LOW);
  digitalWrite(FEED_IN2, LOW);
  analogWrite(FEED_EN, 0);

  digitalWrite(CLEAN_IN3, LOW);
  digitalWrite(CLEAN_IN4, LOW);
  analogWrite(CLEAN_EN, 0);
}

// Logic: Forward half time, Backward half time (From User Request)
void runFeeder() {
  Serial.println("Starting Feeder Sequence...");
  
  // 1. Forward
  digitalWrite(FEED_IN1, HIGH);
  digitalWrite(FEED_IN2, LOW);
  analogWrite(FEED_EN, PWM_SPEED);
  Serial.println("Feeder Forward");
  delay(FEED_DURATION_MS / 2);

  // 2. Stop briefly
  stopAll();
  delay(500);

  // 3. Backward (Anti-Jam)
  digitalWrite(FEED_IN1, LOW);
  digitalWrite(FEED_IN2, HIGH);
  analogWrite(FEED_EN, PWM_SPEED);
  Serial.println("Feeder Backward");
  delay(FEED_DURATION_MS / 2);

  stopAll();
  Serial.println("Feeder Finihsed");
  logAction("FEEDER", "Sequence Completed");
}

void runCleaner() {
  Serial.println("Starting Cleaner...");
  digitalWrite(CLEAN_IN3, HIGH);
  digitalWrite(CLEAN_IN4, LOW);
  analogWrite(CLEAN_EN, PWM_SPEED);
  
  delay(CLEAN_DURATION_MS);
  
  stopAll();
  Serial.println("Cleaner Finished");
  logAction("CLEANER", "Sequence Completed");
}

void checkRemoteCommands() {
  HTTPClient http;
  
  // Check 'relays' table for any flag set to TRUE
  // We check FEEDER
  String url = String(supabase_url) + "/rest/v1/relays?select=*&is_on=eq.true";
  
  http.begin(url);
  http.addHeader("apikey", supabase_key);
  http.addHeader("Authorization", String("Bearer ") + supabase_key);
  
  int httpCode = http.GET();
  
  if (httpCode > 0) {
    String payload = http.getString();
    JSONVar relays = JSON.parse(payload);
    
    if (JSON.typeof(relays) != "undefined" && relays.length() > 0) {
      for (int i = 0; i < relays.length(); i++) {
        String type = (const char*)relays[i]["type"];
        int id = (int)relays[i]["id"];
        
        if (type == "FEEDER") {
          runFeeder();
          resetRelay(id); // Set is_on = false
        } else if (type == "CLEANER") {
          runCleaner();
          resetRelay(id);
        }
      }
    }
  }
  http.end();
}

void resetRelay(int id) {
  HTTPClient http;
  String url = String(supabase_url) + "/rest/v1/relays?id=eq." + String(id);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabase_key);
  http.addHeader("Authorization", String("Bearer ") + supabase_key);
  http.addHeader("Prefer", "return=minimal"); // Don't need response body
  
  // PATCH request to set is_on = false
  String body = "{\"is_on\": false}";
  http.PATCH(body);
  http.end();
}

void logAction(String type, String msg) {
  HTTPClient http;
  String url = String(supabase_url) + "/rest/v1/logs";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabase_key);
  http.addHeader("Authorization", String("Bearer ") + supabase_key);
  
  String body = "{\"type\": \"" + type + "\", \"message\": \"" + msg + "\"}";
  http.POST(body);
  http.end();
}
