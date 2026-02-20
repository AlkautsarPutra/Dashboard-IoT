# 🐔 SiKayPin — Sistem Informasi Kandang Ayam Pintar

Dashboard IoT untuk monitoring dan kontrol kandang ayam secara realtime menggunakan **ESP32**, **Supabase**, dan **Next.js**.

---

## 📋 Daftar Isi

- [Arsitektur Sistem](#arsitektur-sistem)
- [Tech Stack](#tech-stack)
- [Struktur Folder](#struktur-folder)
- [Database (Supabase)](#database-supabase)
- [Firmware ESP32](#firmware-esp32)
- [Web Dashboard (Next.js)](#web-dashboard-nextjs)
- [Integrasi Firmware ↔ Database ↔ Web](#integrasi-firmware--database--web)
- [Cara Menjalankan](#cara-menjalankan)

---

## Arsitektur Sistem

```
┌──────────────────────────────────────────────────────────────┐
│                      WEB DASHBOARD                           │
│              (Next.js + Supabase Client)                     │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Suhu   │  │Kelembab-│  │  Status  │  │   System     │  │
│  │  Chart  │  │an Chart │  │  Pakan   │  │    Log       │  │
│  └────┬────┘  └────┬────┘  └────┬─────┘  └──────┬───────┘  │
│       │            │            │                │           │
│  ┌────┴────┐  ┌────┴────┐  ┌───┴────────────────┴───────┐  │
│  │ Kontrol │  │ Kontrol │  │     Penjadwalan            │  │
│  │  Pakan  │  │ Kotoran │  │  (Waktu Tetap / Interval)  │  │
│  └────┬────┘  └────┬────┘  └───────────┬────────────────┘  │
│       └────────────┴───────────────────┘                    │
│                        │ Supabase Realtime + REST           │
└────────────────────────┼────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │   SUPABASE (Cloud)  │
              │                     │
              │  ├── readings       │ ← data sensor (suhu, kelembaban)
              │  ├── relays         │ ← status motor (on/off, arah)
              │  ├── sensor_status  │ ← status limit switch
              │  ├── schedules      │ ← jadwal otomatis
              │  └── logs           │ ← catatan sistem
              └──────────┬──────────┘
                         │ HTTP REST API
              ┌──────────┴──────────┐
              │     ESP32 MCU       │
              │                     │
              │  ├── DHT22 Sensor   │ → kirim suhu & kelembaban
              │  ├── Motor Pakan    │ ← baca perintah dari relays
              │  ├── Motor Kotoran  │ ← baca perintah dari relays
              │  └── Limit Switch   │ → kirim status sensor
              └─────────────────────┘
```

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| **Microcontroller** | ESP32 (Arduino Framework) |
| **Sensor** | DHT22 (suhu & kelembaban), Limit Switch |
| **Motor Driver** | L298N (2 channel, menggunakan `digitalWrite`) |
| **Database** | Supabase (PostgreSQL + Realtime) |
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS v4 |
| **UI Library** | shadcn/ui (custom), Lucide Icons, Framer Motion |
| **Chart** | Recharts |

---

## Struktur Folder

```
Dashboard-IoT/
├── esp32-firmware/
│   └── main.ino                 # Firmware ESP32
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout + metadata
│   │   ├── page.tsx             # Halaman utama dashboard
│   │   └── globals.css          # CSS theme + glassmorphism
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── SensorChart.tsx   # Grafik suhu/kelembaban (Recharts)
│   │   │   ├── SensorStatus.tsx  # Status limit switch (penuh/mengisi/siaga)
│   │   │   ├── PakanControl.tsx  # Kontrol motor pakan (on/off + arah)
│   │   │   ├── KotoranControl.tsx# Kontrol motor kotoran (on/off + arah)
│   │   │   ├── ScheduleManager.tsx # Penjadwalan (fixed + interval)
│   │   │   ├── DeviceStatus.tsx  # Status online/offline ESP32
│   │   │   └── SystemLog.tsx     # Terminal log realtime
│   │   ├── ui/
│   │   │   ├── badge.tsx         # Badge component
│   │   │   ├── button.tsx        # Button component
│   │   │   ├── card.tsx          # Card component
│   │   │   └── theme-toggle.tsx  # Toggle dark/light mode
│   │   └── SceneryBackground.tsx # Animasi background (siang/malam)
│   ├── lib/
│   │   └── supabase.ts          # Supabase client instance
│   └── types/
│       └── index.ts             # TypeScript interfaces
├── supabase/
│   ├── schema.sql               # Tabel utama (readings, relays, logs)
│   ├── setup_sensor_status.sql  # Tabel sensor_status
│   ├── schedules.sql            # Tabel schedules (penjadwalan)
│   ├── add_direction_column.sql # Migrasi kolom direction
│   └── fix_permissions.sql      # RLS policies
└── package.json
```

---

## Database (Supabase)

### Tabel `readings` — Data Sensor
Menyimpan pembacaan sensor DHT22 yang dikirim ESP32 setiap 10 detik.

```sql
readings (
  id          bigint PRIMARY KEY,
  created_at  timestamptz,
  temperature numeric,          -- suhu dalam °C
  humidity    numeric,          -- kelembaban dalam %
  device_id   text              -- identifier ESP32
)
```

### Tabel `relays` — Status Motor
Menyimpan status on/off dan arah putaran setiap motor. Dashboard menulis ke tabel ini, ESP32 membacanya.

```sql
relays (
  id          bigint PRIMARY KEY,
  created_at  timestamptz,
  name        text,             -- nama relay ('Auger Feeder', 'Waste Conveyor')
  is_on       boolean,          -- true = motor nyala
  type        text,             -- 'FEEDER' untuk pakan, 'CLEANER' untuk kotoran
  direction   text,             -- 'FORWARD' atau 'BACKWARD'
  device_id   text
)
```

**Default rows:**
| name | type | device_id |
|---|---|---|
| Auger Feeder | FEEDER | esp32_feeder |
| Waste Conveyor | CLEANER | esp32_feeder |

### Tabel `sensor_status` — Status Limit Switch
Data yang dikirim ESP32 setiap 10 detik, berisi status limit switch dan apakah motor sedang berjalan.

```sql
sensor_status (
  id              bigint PRIMARY KEY,
  created_at      timestamptz,
  device_id       text,
  sensor_name     text,           -- 'limit_switch'
  is_triggered    boolean,        -- true = wadah penuh
  motors_running  boolean         -- true = ada motor yang nyala
)
```

### Tabel `schedules` — Penjadwalan Otomatis
Menyimpan jadwal otomatis yang dibuat dari dashboard. Mendukung 2 mode.

```sql
schedules (
  id                bigint PRIMARY KEY,
  created_at        timestamptz,
  relay_type        text,         -- 'FEEDER' atau 'CLEANER'
  schedule_mode     text,         -- 'fixed' (waktu tetap) atau 'interval'
  schedule_time     time,         -- jam:menit untuk mode fixed (contoh: '08:00')
  interval_minutes  int,          -- menit untuk mode interval (contoh: 240 = 4 jam)
  direction         text,         -- 'FORWARD' atau 'BACKWARD'
  duration_seconds  int,          -- durasi motor nyala (contoh: 30 = 30 detik)
  is_active         boolean,      -- aktif/nonaktif jadwal
  last_triggered_at timestamptz,  -- kapan terakhir dijalankan
  label             text          -- label opsional (contoh: 'Pakan Pagi')
)
```

### Tabel `logs` — Catatan Sistem
Log aktivitas dari dashboard dan penjadwalan.

```sql
logs (
  id          bigint PRIMARY KEY,
  created_at  timestamptz,
  message     text,             -- pesan log
  type        text              -- 'INFO', 'WARNING', 'ERROR', 'SUCCESS'
)
```

### Realtime
Semua tabel di atas **diaktifkan Realtime** via:
```sql
alter publication supabase_realtime add table public.<nama_tabel>;
```
Ini memungkinkan dashboard menerima update secara instan tanpa polling.

---

## Firmware ESP32 — Penjelasan Detail Codebase

File: `esp32-firmware/main.ino`

### 1. Library & Konfigurasi

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "vivo Y22";
const char* password = "lali to?";

const char* supabase_url = "https://xltfpllfyjxjmwdwocjl.supabase.co";
const char* supabase_key = "eyJhbGci..."; // API key Supabase
```

**Penjelasan:**
- `WiFi.h` — library bawaan ESP32 untuk koneksi WiFi (mode STA/AP).
- `HTTPClient.h` — library untuk mengirim HTTP request (GET, POST) ke server. Digunakan untuk komunikasi dengan Supabase REST API.
- `ssid` dan `password` — kredensial WiFi yang akan disambungkan ESP32.
- `supabase_url` — URL project Supabase kita, semua request API dikirim ke URL ini.
- `supabase_key` — anon key Supabase, berfungsi sebagai autentikasi saat mengakses REST API. Key ini dikirim sebagai header `apikey` dan `Authorization: Bearer`.

---

### 2. Definisi Pin

```cpp
const int PIN_IN1 = 12;  // Auger Motor A
const int PIN_IN2 = 14;  // Auger Motor B
const int PIN_IN3 = 27;  // Konveyor Motor A
const int PIN_IN4 = 26;  // Konveyor Motor B
const int PIN_SENSOR = 4; // Limit Switch
```

**Penjelasan:**
- `PIN_IN1` dan `PIN_IN2` — dua pin untuk mengontrol **motor pakan** (auger) melalui driver motor L298N. Jika IN1=HIGH dan IN2=LOW, motor putar kanan (FORWARD). Sebaliknya, motor putar kiri (BACKWARD).
- `PIN_IN3` dan `PIN_IN4` — dua pin untuk mengontrol **motor kotoran** (conveyor) dengan cara yang sama.
- `PIN_SENSOR` — pin untuk **limit switch**. Menggunakan `INPUT_PULLUP`, artinya pin secara default bernilai HIGH. Ketika limit switch ditekan (wadah penuh), pin menjadi LOW.

---

### 3. Variabel Status

```cpp
unsigned long lastCommandCheck = 0;
unsigned long lastStatusSend = 0;
unsigned long lastWiFiCheck = 0;

bool augerOn = false;
bool conveyorOn = false;
String augerDir = "FORWARD";
String conveyorDir = "FORWARD";

int failedRequests = 0;
```

**Penjelasan:**
- `lastCommandCheck`, `lastStatusSend`, `lastWiFiCheck` — variabel waktu untuk mengatur interval polling menggunakan `millis()`. Ini menghindari penggunaan `delay()` yang bersifat blocking (menghentikan semua proses).
- `augerOn`, `conveyorOn` — status ON/OFF masing-masing motor. Nilai ini diperbarui dari respons Supabase.
- `augerDir`, `conveyorDir` — arah putaran motor (`"FORWARD"` atau `"BACKWARD"`).
- `failedRequests` — penghitung request gagal berturut-turut. Jika mencapai 5, WiFi akan di-disconnect dan reconnect.

---

### 4. Fungsi `setup()`

```cpp
void setup() {
  Serial.begin(115200);
  
  pinMode(PIN_IN1, OUTPUT);
  pinMode(PIN_IN2, OUTPUT);
  pinMode(PIN_IN3, OUTPUT);
  pinMode(PIN_IN4, OUTPUT);
  pinMode(PIN_SENSOR, INPUT_PULLUP);
  
  stopAllMotors();
  
  Serial.println("=== Smart Poultry v3.4 - FULL SPEED ===");
  connectWiFi();
}
```

**Penjelasan:**
- `Serial.begin(115200)` — inisialisasi komunikasi serial dengan baud rate 115200 bps. Digunakan untuk debugging via Serial Monitor.
- `pinMode(PIN_IN1, OUTPUT)` — set pin motor sebagai OUTPUT. Pin output bisa menghasilkan sinyal HIGH (3.3V) atau LOW (0V) untuk mengontrol motor driver.
- `pinMode(PIN_SENSOR, INPUT_PULLUP)` — set pin sensor sebagai INPUT dengan pull-up resistor internal. Artinya pin default HIGH, dan menjadi LOW ketika limit switch menyambung ke GND (ditekan).
- `stopAllMotors()` — matikan semua motor saat pertama kali dinyalakan (safety measure).
- `connectWiFi()` — sambungkan ke WiFi.

---

### 5. Fungsi `connectWiFi()`

```cpp
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
```

**Penjelasan:**
- `WiFi.mode(WIFI_STA)` — set ESP32 ke mode **Station** (client), artinya ESP32 menyambung ke router WiFi yang sudah ada, bukan membuat hotspot sendiri.
- `WiFi.begin(ssid, password)` — mulai proses koneksi ke WiFi menggunakan SSID dan password yang sudah diset.
- Loop `while` — coba sambung terus selama maksimal 30 kali (30 × 500ms = 15 detik). Jika dalam 15 detik tidak tersambung, lanjut tanpa WiFi.
- `WiFi.localIP()` — menampilkan IP address yang didapatkan ESP32 dari router (via DHCP).

---

### 6. Fungsi `loop()` — Main Loop

```cpp
void loop() {
  int sensorState = digitalRead(PIN_SENSOR);
  
  // Safety stop
  if (sensorState == LOW && (augerOn || conveyorOn)) {
    stopAllMotors();
    augerOn = false;
    conveyorOn = false;
    Serial.println("SAFETY STOP!");
  }
  
  // Check WiFi every 5 seconds
  if (millis() - lastWiFiCheck > 5000) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi lost, reconnecting...");
      connectWiFi();
    }
    lastWiFiCheck = millis();
  }
  
  // Check commands every 500ms
  if (millis() - lastCommandCheck > 500) {
    if (WiFi.status() == WL_CONNECTED) {
      checkCommands();
    }
    lastCommandCheck = millis();
  }
  
  // Send status every 10 seconds
  if (millis() - lastStatusSend > 10000) {
    if (WiFi.status() == WL_CONNECTED) {
      sendStatus(sensorState == LOW);
    }
    lastStatusSend = millis();
  }
  
  // Apply motor states continuously
  applyMotorStates();
  
  delay(50);
}
```

**Penjelasan baris per baris:**
1. **`digitalRead(PIN_SENSOR)`** — Baca status limit switch. Hasilnya `LOW` jika wadah penuh (switch ditekan), `HIGH` jika belum penuh.
2. **Safety Stop** — Jika limit switch ter-trigger (`LOW`) DAN ada motor yang nyala (`augerOn || conveyorOn`), maka **semua motor langsung dimatikan**. Ini adalah mekanisme keamanan level hardware — motor pasti berhenti meskipun internet mati.
3. **Cek WiFi (setiap 5 detik)** — Menggunakan `millis()` untuk mengecek apakah WiFi masih tersambung. `millis()` mengembalikan jumlah milidetik sejak ESP32 dinyalakan. Jika selisih dengan `lastWiFiCheck` sudah > 5000ms (5 detik), cek status WiFi.
4. **Cek Perintah (setiap 500ms)** — Memanggil `checkCommands()` untuk membaca tabel `relays` dari Supabase. Interval 500ms cukup responsif tapi tidak membebani server.
5. **Kirim Status (setiap 10 detik)** — Memanggil `sendStatus()` untuk mengirim data limit switch dan status motor ke Supabase. Dashboard menggunakan data ini untuk menampilkan status device.
6. **`applyMotorStates()`** — Dijalankan setiap loop cycle (~50ms) untuk memastikan sinyal motor selalu sesuai dengan state terbaru.
7. **`delay(50)`** — Jeda 50ms per loop untuk stabilitas. Tanpa delay, loop berjalan terlalu cepat dan bisa menyebabkan WDT (Watchdog Timer) reset.

---

### 7. Fungsi `checkCommands()` — Baca Perintah dari Supabase

```cpp
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
        Serial.println(augerOn ? ">>> AUGER: ON" : ">>> AUGER: OFF");
      }
      augerDir = (section.indexOf("BACKWARD") >= 0) ? "BACKWARD" : "FORWARD";
    }
    
    // Parse CLEANER (sama seperti FEEDER)
    int cleanerIdx = payload.indexOf("CLEANER");
    if (cleanerIdx >= 0) {
      int start = (cleanerIdx - 50 < 0) ? 0 : cleanerIdx - 50;
      String section = payload.substring(start, cleanerIdx + 50);
      
      bool newState = section.indexOf("\"is_on\":true") >= 0;
      if (newState != conveyorOn) {
        conveyorOn = newState;
        Serial.println(conveyorOn ? ">>> CONVEYOR: ON" : ">>> CONVEYOR: OFF");
      }
      conveyorDir = (section.indexOf("BACKWARD") >= 0) ? "BACKWARD" : "FORWARD";
    }
    
  } else {
    failedRequests++;
    Serial.printf("Request failed: %d\n", httpCode);
    if (failedRequests >= 5) {
      WiFi.disconnect();
      delay(1000);
      connectWiFi();
      failedRequests = 0;
    }
  }
  
  http.end();
}
```

**Penjelasan:**
1. **`HTTPClient http`** — Buat objek HTTP client untuk mengirim request.
2. **`http.setTimeout(3000)`** — Set timeout 3 detik. Jika server tidak merespons dalam 3 detik, request dibatalkan agar tidak memblokir loop.
3. **URL** — Request ke endpoint Supabase REST API: `/rest/v1/relays?select=type,is_on,direction`. Parameter `select` membatasi kolom yang dikembalikan agar respons lebih kecil.
4. **Headers** — Supabase REST API membutuhkan 2 header:
   - `apikey` — anon key untuk identifikasi project
   - `Authorization: Bearer <key>` — autentikasi standar JWT
5. **`http.GET()`** — Kirim HTTP GET request. Return value `httpCode` berisi status code (200 = sukses).
6. **Parsing JSON** — Karena ESP32 memori terbatas, kita **tidak pakai JSON parser library**. Sebagai gantinya, cari kata kunci langsung di string:
   - Cari index kata `"FEEDER"` di respons
   - Ambil substring 50 karakter sebelum dan sesudah kata tersebut
   - Cek apakah substring mengandung `"is_on":true` → motor ON
   - Cek apakah substring mengandung `"BACKWARD"` → arah motor
7. **Error Handling** — Jika request gagal 5 kali berturut-turut, disconnect WiFi, tunggu 1 detik, lalu reconnect. Ini mengatasi masalah WiFi yang "tersambung tapi tidak bisa akses internet".
8. **`http.end()`** — Wajib dipanggil setelah request selesai untuk membebaskan resource.

---

### 8. Fungsi `sendStatus()` — Kirim Status ke Supabase

```cpp
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
    Serial.println("Status sent OK");
  } else {
    Serial.println("Status send FAILED");
  }
  http.end();
}
```

**Penjelasan:**
1. **Parameter `limitTriggered`** — boolean dari `digitalRead(PIN_SENSOR) == LOW`.
2. **URL** — POST ke `/rest/v1/sensor_status`, ini akan **INSERT row baru** di tabel `sensor_status`.
3. **Headers tambahan:**
   - `Content-Type: application/json` — body kita berformat JSON
   - `Prefer: return=minimal` — agar Supabase tidak mengembalikan data yang diinsert (menghemat bandwidth)
4. **Body JSON** — Kita bangun string JSON secara manual (tanpa library) berisi:
   - `device_id` — identifier ESP32
   - `sensor_name` — nama sensor (`"limit_switch"`)
   - `is_triggered` — apakah limit switch ditekan (wadah penuh)
   - `motors_running` — apakah ada motor yang sedang berputar
5. **`http.POST(body)`** — Kirim HTTP POST dengan body JSON. Dashboard akan menerima data ini via Supabase Realtime dan menampilkan status terkini.

---

### 9. Fungsi `applyMotorStates()` — Kontrol Motor

```cpp
void applyMotorStates() {
  // === AUGER MOTOR (Motor Pakan) ===
  if (augerOn) {
    if (augerDir == "FORWARD") {
      digitalWrite(PIN_IN1, HIGH);
      digitalWrite(PIN_IN2, LOW);
    } else {
      digitalWrite(PIN_IN1, LOW);
      digitalWrite(PIN_IN2, HIGH);
    }
  } else {
    digitalWrite(PIN_IN1, LOW);
    digitalWrite(PIN_IN2, LOW);
  }
  
  // === CONVEYOR MOTOR (Motor Kotoran) ===
  if (conveyorOn) {
    if (conveyorDir == "FORWARD") {
      digitalWrite(PIN_IN3, HIGH);
      digitalWrite(PIN_IN4, LOW);
    } else {
      digitalWrite(PIN_IN3, LOW);
      digitalWrite(PIN_IN4, HIGH);
    }
  } else {
    digitalWrite(PIN_IN3, LOW);
    digitalWrite(PIN_IN4, LOW);
  }
}
```

**Penjelasan:**
- Fungsi ini mengontrol motor melalui driver L298N menggunakan `digitalWrite()` (kecepatan penuh, bukan PWM).
- **Cara kerja L298N:**
  - IN1=HIGH, IN2=LOW → Motor putar **kanan** (FORWARD)
  - IN1=LOW, IN2=HIGH → Motor putar **kiri** (BACKWARD)
  - IN1=LOW, IN2=LOW → Motor **berhenti** (brake)
- Pola yang sama berlaku untuk motor kotoran (IN3, IN4).
- Fungsi ini dipanggil **setiap 50ms** di loop utama untuk memastikan sinyal motor selalu konsisten.

---

### 10. Fungsi `stopAllMotors()` — Emergency Stop

```cpp
void stopAllMotors() {
  digitalWrite(PIN_IN1, LOW);
  digitalWrite(PIN_IN2, LOW);
  digitalWrite(PIN_IN3, LOW);
  digitalWrite(PIN_IN4, LOW);
  Serial.println("Motors STOPPED");
}
```

**Penjelasan:**
- Set **semua 4 pin** ke LOW → semua motor berhenti.
- Dipanggil di 2 tempat:
  1. `setup()` — saat ESP32 pertama kali dinyalakan (agar motor tidak berputar random)
  2. `loop()` — saat limit switch ter-trigger (safety stop)

---

## Web Dashboard (Next.js) — Penjelasan Detail Codebase

### 1. Koneksi Supabase (`lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Penjelasan:**
- `createClient()` — membuat instance Supabase client yang dipakai di seluruh komponen.
- `process.env.NEXT_PUBLIC_SUPABASE_URL` — membaca URL dari environment variable (file `.env`). Prefix `NEXT_PUBLIC_` artinya variabel ini bisa diakses di browser (client-side).
- `export const supabase` — diekspor sebagai singleton, jadi semua komponen pakai koneksi yang sama.

---

### 2. Type Definitions (`types/index.ts`)

```typescript
export interface SensorReading {
  id: number
  created_at: string
  temperature: number
  humidity: number
  device_id: string
}

export interface RelayState {
  id: number
  name: string
  is_on: boolean
  type: 'FEEDER' | 'CLEANER'
  direction: 'FORWARD' | 'BACKWARD'
}

export interface Schedule {
  id: number
  created_at: string
  relay_type: 'FEEDER' | 'CLEANER'
  schedule_mode: 'fixed' | 'interval'
  schedule_time: string | null
  interval_minutes: number | null
  direction: 'FORWARD' | 'BACKWARD'
  duration_seconds: number
  is_active: boolean
  last_triggered_at: string | null
  label: string | null
}
```

**Penjelasan:**
- TypeScript interfaces mendefinisikan **bentuk data** yang diterima dari Supabase.
- `SensorReading` — cocok dengan tabel `readings` (suhu, kelembaban).
- `RelayState` — cocok dengan tabel `relays` (status motor).
- `Schedule` — cocok dengan tabel `schedules` (jadwal otomatis). Field `schedule_time` dan `interval_minutes` bersifat nullable karena hanya salah satu yang diisi tergantung mode.

---

### 3. Halaman Utama (`app/page.tsx`)

```tsx
"use client"

import { motion } from "framer-motion"
import SensorChart from "@/components/dashboard/SensorChart"
import PakanControl from "@/components/dashboard/PakanControl"
import KotoranControl from "@/components/dashboard/KotoranControl"
import SensorStatus from "@/components/dashboard/SensorStatus"
import DeviceStatus from "@/components/dashboard/DeviceStatus"
import SystemLogComponent from "@/components/dashboard/SystemLog"
import ScheduleManager from "@/components/dashboard/ScheduleManager"
```

**Penjelasan:**
- `"use client"` — **wajib** di Next.js App Router. Menandai bahwa komponen ini berjalan di browser (client-side), bukan di server. Diperlukan karena kita menggunakan `framer-motion` (animasi) dan hooks React.
- `import { motion } from "framer-motion"` — library animasi. `motion.div` adalah wrapper yang menambahkan animasi ke elemen HTML biasa.
- `@/components/...` — alias path yang menunjuk ke folder `src/components/`. Dikonfigurasi di `tsconfig.json`.

```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}
```

**Penjelasan:**
- `container` — objek animasi untuk parent. `staggerChildren: 0.1` artinya setiap child muncul dengan jeda 0.1 detik (efek berurutan).
- `item` — objek animasi untuk child. Mulai dari transparan + 20px di bawah (`opacity: 0, y: 20`), lalu naik ke posisi normal (`opacity: 1, y: 0`).

```tsx
export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <SceneryBackground />
      
      <header className="sticky top-0 z-50 border-b bg-white/70 backdrop-blur-xl dark:bg-black/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <h1>SiKayPin</h1>
            <p>Sistem Informasi Kandang Ayam Pintar</p>
          </div>
          <div className="flex items-center gap-3">
            <DeviceStatus />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 p-3 md:p-4 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          
          {/* Section 1: Monitoring */}
          <motion.section variants={container} initial="hidden" animate="show">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <SensorChart type="temperature" title="Suhu" color="#ef4444" />
              <SensorChart type="humidity" title="Kelembaban" color="#3b82f6" />
              <SensorStatus />
            </div>
          </motion.section>

          {/* Section 2: Kontrol Manual */}
          <motion.section variants={container} initial="hidden" whileInView="show">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <PakanControl />
              <KotoranControl />
            </div>
          </motion.section>

          {/* Section 3: Penjadwalan */}
          <ScheduleManager />

          {/* Section 4: System Log */}
          <SystemLogComponent />
        </div>
      </main>
    </div>
  )
}
```

**Penjelasan:**
- **Layout**: `min-h-screen flex flex-col` — halaman minimal setinggi layar, kolom vertikal.
- **Header sticky**: `sticky top-0 z-50` — header tetap di atas saat scroll. `backdrop-blur-xl` memberikan efek kaca buram.
- **Grid responsive**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` artinya:
  - Mobile: 1 kolom
  - Tablet (≥640px): 2 kolom
  - Desktop (≥1024px): 3 kolom
- **`animate="show"`** — langsung animasi saat halaman load.
- **`whileInView="show"`** — animasi dimulai saat elemen masuk viewport (scroll reveal).

---

### 4. Grafik Sensor (`SensorChart.tsx`)

```tsx
const [data, setData] = useState<SensorReading[]>([])

useEffect(() => {
  // Ambil 20 data terakhir
  const fetchData = async () => {
    const { data: readings } = await supabase
      .from('readings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (readings) setData(readings.reverse())
  }

  fetchData()

  // Realtime subscription
  const channel = supabase
    .channel('readings_realtime')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'readings' },
      (payload) => {
        setData(prev => [...prev.slice(-19), payload.new as SensorReading])
      }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [])
```

**Penjelasan:**
- `useState<SensorReading[]>([])` — state untuk menyimpan array data sensor. Initial value: array kosong.
- **Fetch awal** — `supabase.from('readings').select('*')` mengambil semua kolom dari tabel `readings`. `.order('created_at', { ascending: false }).limit(20)` mengambil 20 data terbaru. `.reverse()` membalik urutan agar data lama di kiri, baru di kanan (untuk grafik).
- **Realtime subscription** — `.on('postgres_changes', { event: 'INSERT' })` mendengarkan event INSERT baru di tabel `readings`. Setiap kali ESP32 mengirim data baru, callback langsung terpanggil.
- `setData(prev => [...prev.slice(-19), payload.new])` — ambil 19 data terakhir dari state lama, tambahkan data baru di akhir. Ini menjaga grafik selalu menampilkan 20 titik data.
- **Cleanup** — `return () => { supabase.removeChannel(channel) }` menghapus subscription saat komponen di-unmount untuk menghindari memory leak.

```tsx
<ResponsiveContainer width="100%" height={120}>
  <AreaChart data={data}>
    <defs>
      <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
        <stop offset="95%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
    <Area
      type="monotone"
      dataKey={type}
      stroke={color}
      fill={`url(#gradient-${type})`}
      strokeWidth={2}
    />
  </AreaChart>
</ResponsiveContainer>
```

**Penjelasan:**
- `ResponsiveContainer` — wrapper dari Recharts yang membuat grafik responsive (mengikuti lebar parent).
- `linearGradient` — membuat efek gradient fill di bawah garis grafik. Atas 30% opak, bawah transparan.
- `Area type="monotone"` — tipe grafik area dengan garis halus (monotone curve).
- `dataKey={type}` — kolom data yang digunakan. Jika `type="temperature"`, ambil field `temperature` dari setiap reading.

---

### 5. Status Sensor (`SensorStatus.tsx`)

```tsx
const [status, setStatus] = useState<{
  is_triggered: boolean
  motors_running: boolean
} | null>(null)

useEffect(() => {
  const fetchStatus = async () => {
    const { data } = await supabase
      .from('sensor_status')
      .select('is_triggered, motors_running')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (data) setStatus(data)
  }

  fetchStatus()

  const channel = supabase
    .channel('sensor_status_changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'sensor_status' },
      (payload) => { setStatus(payload.new as any) }
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [])
```

**Penjelasan:**
- Mengambil **1 data terbaru** dari tabel `sensor_status` menggunakan `.limit(1).single()`.
- `is_triggered` — jika true, tampilkan "Wadah Penuh" (hijau). Jika false, cek `motors_running`.
- `motors_running` — jika true, tampilkan "Mengisi..." (kuning). Jika false, tampilkan "Siaga" (abu-abu).
- Realtime subscription memastikan status selalu terbaru tanpa perlu refresh.

---

### 6. Kontrol Pakan (`PakanControl.tsx`)

```tsx
export default function PakanControl() {
  const [isOn, setIsOn] = useState(false)
  const [direction, setDirection] = useState<'FORWARD' | 'BACKWARD'>('FORWARD')
  const [loading, setLoading] = useState(false)

  // Ambil status awal dari Supabase
  useEffect(() => {
    const fetchState = async () => {
      const { data } = await supabase
        .from('relays')
        .select('is_on, direction')
        .eq('type', 'FEEDER')
        .single()
      
      if (data) {
        setIsOn(data.is_on)
        setDirection(data.direction || 'FORWARD')
      }
    }
    fetchState()
  }, [])
```

**Penjelasan:**
- `.eq('type', 'FEEDER')` — filter hanya relay bertipe FEEDER (motor pakan).
- `.single()` — karena hanya ada 1 row FEEDER, ambil sebagai objek tunggal (bukan array).
- State `isOn` dan `direction` diinisialisasi dari database agar UI sinkron dengan kondisi sebenarnya.

```tsx
  const toggleMotor = async () => {
    setLoading(true)
    const newState = !isOn

    // Update relay di Supabase
    await supabase
      .from('relays')
      .update({ is_on: newState, direction })
      .eq('type', 'FEEDER')

    // Tulis log
    await supabase.from('logs').insert({
      message: `Pakan ${newState ? 'ON' : 'OFF'} - Arah: ${direction}`,
      type: newState ? 'SUCCESS' : 'INFO'
    })

    setIsOn(newState)
    setLoading(false)
  }
```

**Penjelasan:**
- `toggleMotor()` — dipanggil saat user menekan tombol START/STOP.
- `supabase.from('relays').update({...}).eq('type', 'FEEDER')` — **UPDATE** row di tabel relays dimana type='FEEDER'. Ini mengubah status `is_on` dan `direction`.
- ESP32 akan membaca perubahan ini pada polling berikutnya (setiap 500ms) dan langsung menggerakkan motor.
- Log juga ditulis ke tabel `logs` agar tercatat di System Log.

```tsx
  const changeDirection = async (dir: 'FORWARD' | 'BACKWARD') => {
    if (isOn) return  // Tidak boleh ganti arah saat motor nyala
    setDirection(dir)
    await supabase
      .from('relays')
      .update({ direction: dir })
      .eq('type', 'FEEDER')
  }
```

**Penjelasan:**
- `if (isOn) return` — **safety check**: arah motor tidak boleh diubah saat motor sedang berputar. Mengubah arah secara tiba-tiba bisa merusak mekanisme dan motor.

---

### 7. Penjadwalan (`ScheduleManager.tsx`)

#### a. Fetch & Realtime

```tsx
const [schedules, setSchedules] = useState<Schedule[]>([])
const [activeTab, setActiveTab] = useState<'FEEDER' | 'CLEANER'>('FEEDER')

const fetchSchedules = useCallback(async () => {
  const { data } = await supabase
    .from('schedules')
    .select('*')
    .order('created_at', { ascending: true })
  
  if (data) setSchedules(data as Schedule[])
  setLoading(false)
}, [])

useEffect(() => {
  fetchSchedules()

  const channel = supabase
    .channel('schedules_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'schedules' },
      () => fetchSchedules()
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [fetchSchedules])
```

**Penjelasan:**
- `event: '*'` — mendengarkan **semua event** (INSERT, UPDATE, DELETE) pada tabel schedules. Setiap kali ada perubahan, seluruh data di-fetch ulang.
- `useCallback` — memoize fungsi `fetchSchedules` agar tidak dibuat ulang setiap render (menghindari infinite loop di `useEffect`).
- `activeTab` — filter jadwal berdasarkan tipe relay (Pakan atau Kotoran).

#### b. Logika Auto-Trigger (Inti Penjadwalan)

```tsx
useEffect(() => {
  const checkSchedules = async () => {
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // "08:30"

    for (const schedule of schedules) {
      if (!schedule.is_active) continue  // Skip jadwal nonaktif

      let shouldTrigger = false

      // === MODE FIXED (Waktu Tetap) ===
      if (schedule.schedule_mode === 'fixed' && schedule.schedule_time) {
        const schedTime = schedule.schedule_time.slice(0, 5)  // "08:00"
        if (schedTime === currentTime) {
          // Cek duplikasi: sudah trigger di menit ini?
          if (schedule.last_triggered_at) {
            const lastTriggered = new Date(schedule.last_triggered_at)
            const diffMs = now.getTime() - lastTriggered.getTime()
            if (diffMs < 60000) continue  // Sudah trigger < 1 menit lalu
          }
          shouldTrigger = true
        }
      }

      // === MODE INTERVAL ===
      if (schedule.schedule_mode === 'interval' && schedule.interval_minutes) {
        if (schedule.last_triggered_at) {
          const lastTriggered = new Date(schedule.last_triggered_at)
          const diffMin = (now.getTime() - lastTriggered.getTime()) / 60000
          if (diffMin >= schedule.interval_minutes) {
            shouldTrigger = true  // Sudah lewat interval
          }
        } else {
          shouldTrigger = true  // Belum pernah trigger → trigger sekarang
        }
      }
```

**Penjelasan:**
- **`checkSchedules()`** dijalankan setiap 30 detik via `setInterval`.
- **Mode Fixed**: Bandingkan jam:menit sekarang (`"08:30"`) dengan jadwal (`"08:00"`). Jika cocok, trigger. Pengecekan `last_triggered_at` mencegah trigger berulang dalam menit yang sama.
- **Mode Interval**: Hitung selisih waktu dari `last_triggered_at` ke sekarang (dalam menit). Jika sudah lewat `interval_minutes`, trigger. Jika belum pernah trigger (`null`), langsung trigger pertama kali.

```tsx
      if (shouldTrigger) {
        // 1. Nyalakan relay
        await supabase
          .from('relays')
          .update({ is_on: true, direction: schedule.direction })
          .eq('type', schedule.relay_type)

        // 2. Update waktu terakhir trigger
        await supabase
          .from('schedules')
          .update({ last_triggered_at: now.toISOString() })
          .eq('id', schedule.id)

        // 3. Tulis log
        const labelName = schedule.relay_type === 'FEEDER' ? 'Pakan' : 'Kotoran'
        await supabase.from('logs').insert({
          message: `⏰ Jadwal ${labelName}: ON (${schedule.duration_seconds}s)`,
          type: 'INFO'
        })

        // 4. Auto-stop setelah durasi habis
        setTimeout(async () => {
          await supabase
            .from('relays')
            .update({ is_on: false })
            .eq('type', schedule.relay_type)

          await supabase.from('logs').insert({
            message: `⏰ Jadwal ${labelName}: OFF (auto-stop)`,
            type: 'SUCCESS'
          })
        }, schedule.duration_seconds * 1000)
      }
    }
  }

  const interval = setInterval(checkSchedules, 30000) // Cek setiap 30 detik
  return () => clearInterval(interval)
}, [schedules])
```

**Penjelasan:**
1. **Nyalakan relay** — UPDATE tabel `relays` set `is_on: true` dengan arah yang sudah diset di jadwal. ESP32 akan membaca ini dan nyalakan motor.
2. **Update `last_triggered_at`** — catat waktu trigger agar tidak double-trigger.
3. **Tulis log** — agar user bisa lihat kapan jadwal dijalankan.
4. **Auto-stop** — `setTimeout()` menunggu `duration_seconds × 1000` ms, lalu matikan relay. Contoh: duration 30 → tunggu 30 detik → set `is_on: false`.

#### c. Tambah Jadwal Baru

```tsx
const addSchedule = async () => {
  const newSchedule = {
    relay_type: activeTab,           // 'FEEDER' atau 'CLEANER'
    schedule_mode: mode,             // 'fixed' atau 'interval'
    schedule_time: mode === 'fixed' ? time : null,
    interval_minutes: mode === 'interval' ? intervalMin : null,
    direction,
    duration_seconds: duration,
    is_active: true,
    label: label || null
  }

  await supabase.from('schedules').insert(newSchedule)
}
```

**Penjelasan:**
- `schedule_time` hanya diisi jika mode `fixed`, `interval_minutes` hanya diisi jika mode `interval`. Yang lainnya diset `null`.
- `is_active: true` — jadwal baru langsung aktif.
- `label` — opsional, jika kosong diset `null`.

---

### 8. Status Device (`DeviceStatus.tsx`)

```tsx
const [isOnline, setIsOnline] = useState(false)

useEffect(() => {
  const checkStatus = async () => {
    const { data } = await supabase
      .from('sensor_status')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      const lastUpdate = new Date(data.created_at)
      const now = new Date()
      const diffSeconds = (now.getTime() - lastUpdate.getTime()) / 1000
      setIsOnline(diffSeconds < 30)  // Online jika update < 30 detik
    }
  }

  checkStatus()
  const interval = setInterval(checkStatus, 5000)  // Cek setiap 5 detik
  return () => clearInterval(interval)
}, [])
```

**Penjelasan:**
- Mengambil `created_at` terbaru dari tabel `sensor_status`.
- Hitung selisih waktu dengan sekarang. Jika kurang dari 30 detik → ESP32 **online**. Jika lebih → **offline**.
- Logikanya: ESP32 mengirim data setiap 10 detik. Jika sudah lewat 30 detik tanpa data baru, berarti ESP32 sudah tidak terhubung.
- Cek dilakukan setiap 5 detik agar status responsif.

---

### 9. System Log (`SystemLog.tsx`)

```tsx
const [logs, setLogs] = useState<SystemLog[]>([])

useEffect(() => {
  const fetchLogs = async () => {
    const { data } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8)

    if (data) setLogs(data.reverse())
  }

  fetchLogs()

  const channel = supabase
    .channel('logs_realtime')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'logs' },
      () => fetchLogs()
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [])
```

**Penjelasan:**
- Mengambil 8 log terbaru dan menampilkannya dalam urutan kronologis (`.reverse()`).
- Realtime subscription pada event `INSERT` — setiap kali ada log baru (dari kontrol manual, jadwal otomatis), tampilan langsung diperbarui.
- Setiap log memiliki `type` yang menentukan warna:
  - `INFO` → biru
  - `SUCCESS` → hijau
  - `WARNING` → kuning
  - `ERROR` → merah

---

## Integrasi Firmware ↔ Database ↔ Web

### Alur Data Sensor (ESP32 → Database → Web)

```
ESP32                          Supabase                      Dashboard
  │                               │                              │
  │  POST /sensor_status          │                              │
  │  { is_triggered,              │                              │
  │    motors_running }           │                              │
  │ ─────────────────────────────►│                              │
  │                               │  Realtime: INSERT            │
  │                               │ ─────────────────────────────►
  │                               │            SensorStatus      │
  │                               │            DeviceStatus      │
  │                               │                              │
  │  (DHT22 readings juga        │                              │
  │   dikirim ke /readings)      │  Realtime: INSERT            │
  │ ─────────────────────────────►│ ─────────────────────────────►
  │                               │            SensorChart       │
```

### Alur Kontrol Motor — Manual (Web → Database → ESP32)

```
Dashboard                      Supabase                      ESP32
  │                               │                              │
  │  User klik START              │                              │
  │  UPDATE relays                │                              │
  │  SET is_on=true,              │                              │
  │      direction='FORWARD'      │                              │
  │  WHERE type='FEEDER'          │                              │
  │ ─────────────────────────────►│                              │
  │                               │                              │
  │                               │  GET /relays (setiap 500ms)  │
  │                               │◄──────────────────────────────
  │                               │  Response: is_on=true        │
  │                               │──────────────────────────────►│
  │                               │                              │
  │                               │         Motor Pakan: ON      │
  │                               │         digitalWrite(IN1,HIGH)│
```

### Alur Kontrol Motor — Jadwal Otomatis (Web → Database → ESP32)

```
ScheduleManager                Supabase                      ESP32
  │                               │                              │
  │  [Timer 30 detik]             │                              │
  │  Cek: apakah ada jadwal       │                              │
  │  yang waktunya cocok?         │                              │
  │                               │                              │
  │  ✅ Jadwal "Pakan Pagi"       │                              │
  │     mode: fixed, time: 08:00  │                              │
  │     duration: 30s             │                              │
  │                               │                              │
  │  UPDATE relays                │                              │
  │  SET is_on=true               │                              │
  │ ─────────────────────────────►│                              │
  │                               │  GET /relays (polling 500ms) │
  │  UPDATE schedules             │◄──────────────────────────────
  │  SET last_triggered_at=now()  │  Motor ON                    │
  │ ─────────────────────────────►│──────────────────────────────►│
  │                               │                              │
  │  [setTimeout 30 detik]        │                              │
  │                               │                              │
  │  UPDATE relays                │                              │
  │  SET is_on=false              │  GET /relays                 │
  │ ─────────────────────────────►│◄──────────────────────────────
  │                               │  Motor OFF                   │
  │  INSERT logs                  │──────────────────────────────►│
  │  "Jadwal Pakan: OFF"          │                              │
  │ ─────────────────────────────►│                              │
```

### Safety: Limit Switch Override

```
ESP32                          Supabase                      Dashboard
  │                               │                              │
  │  Limit Switch = LOW           │                              │
  │  (wadah penuh)                │                              │
  │                               │                              │
  │  ► stopAllMotors()            │                              │
  │  ► augerOn = false            │                              │
  │  ► conveyorOn = false         │                              │
  │                               │                              │
  │  POST /sensor_status          │                              │
  │  { is_triggered: true,        │                              │
  │    motors_running: false }    │  Realtime update             │
  │ ─────────────────────────────►│ ─────────────────────────────►
  │                               │     SensorStatus: "PENUH"    │
```

> **Catatan:** Safety stop terjadi di level firmware (ESP32), sehingga motor pasti berhenti meskipun koneksi internet terputus.

---

## Cara Menjalankan

### 1. Setup Database (Supabase)

1. Buat project di [supabase.com](https://supabase.com)
2. Buka **SQL Editor**, jalankan file-file SQL secara berurutan:
   ```
   supabase/schema.sql
   supabase/setup_sensor_status.sql
   supabase/fix_permissions.sql
   supabase/add_direction_column.sql
   supabase/schedules.sql
   ```
3. Catat **Project URL** dan **anon key** dari Settings → API

### 2. Setup Web Dashboard

```bash
# Install dependencies
npm install

# Buat file .env di root project
# Isi dengan:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### 3. Setup Firmware ESP32

1. Buka `esp32-firmware/main.ino` di Arduino IDE
2. Edit konfigurasi WiFi:
   ```cpp
   const char* ssid = "NamaWiFi";
   const char* password = "PasswordWiFi";
   ```
3. Edit konfigurasi Supabase:
   ```cpp
   const char* supabase_url = "https://your-project.supabase.co";
   const char* supabase_key = "your-anon-key";
   ```
4. Upload ke ESP32
5. Buka Serial Monitor (115200 baud) untuk debug

### Wiring ESP32

```
ESP32          L298N Motor Driver
─────          ──────────────────
GPIO 12  ───►  IN1 (Motor Pakan A)
GPIO 14  ───►  IN2 (Motor Pakan B)
GPIO 27  ───►  IN3 (Motor Kotoran A)
GPIO 26  ───►  IN4 (Motor Kotoran B)

ESP32          Limit Switch
─────          ────────────
GPIO 4   ───►  Signal (INPUT_PULLUP)
GND      ───►  GND
```

---

## Lisensi

Proyek ini dibuat untuk keperluan PBL (Project Based Learning) IoT Peternakan.
