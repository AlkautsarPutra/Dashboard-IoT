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

## Firmware ESP32

File: `esp32-firmware/main.ino`

### Pin Configuration

| Pin | Fungsi | Keterangan |
|---|---|---|
| GPIO 12 (IN1) | Motor Pakan A | Putar kanan (FORWARD) |
| GPIO 14 (IN2) | Motor Pakan B | Putar kiri (BACKWARD) |
| GPIO 27 (IN3) | Motor Kotoran A | Putar kanan (FORWARD) |
| GPIO 26 (IN4) | Motor Kotoran B | Putar kiri (BACKWARD) |
| GPIO 4 | Limit Switch | INPUT_PULLUP, LOW = triggered |

### Alur Kerja Utama (`loop()`)

```
loop() dijalankan terus-menerus:
│
├── 1. Baca Limit Switch (GPIO 4)
│   └── Jika LOW (wadah penuh) + motor nyala → SAFETY STOP (hentikan semua motor)
│
├── 2. Cek WiFi (setiap 5 detik)
│   └── Jika putus → reconnect
│
├── 3. Cek Perintah (setiap 500ms) → checkCommands()
│   ├── HTTP GET ke Supabase: /rest/v1/relays?select=type,is_on,direction
│   ├── Parse JSON response
│   ├── Update status motor pakan (augerOn, augerDir)
│   └── Update status motor kotoran (conveyorOn, conveyorDir)
│
├── 4. Kirim Status (setiap 10 detik) → sendStatus()
│   └── HTTP POST ke Supabase: /rest/v1/sensor_status
│       Body: { device_id, sensor_name, is_triggered, motors_running }
│
└── 5. Apply Motor States → applyMotorStates()
    ├── Motor Pakan: digitalWrite(IN1, IN2) sesuai augerOn + augerDir
    └── Motor Kotoran: digitalWrite(IN3, IN4) sesuai conveyorOn + conveyorDir
```

### Fungsi-Fungsi

| Fungsi | Keterangan |
|---|---|
| `setup()` | Inisialisasi pin, stop motor, connect WiFi |
| `connectWiFi()` | Connect ke WiFi dengan retry 30x |
| `loop()` | Main loop: safety check → cek WiFi → cek perintah → kirim status → apply motor |
| `checkCommands()` | GET `/relays` dari Supabase, parse `is_on` dan `direction` |
| `sendStatus()` | POST ke `/sensor_status` — status limit switch + motor |
| `applyMotorStates()` | Set pin HIGH/LOW sesuai status auger dan conveyor |
| `stopAllMotors()` | Semua pin LOW (emergency stop) |

### Keamanan
- **Safety Stop**: Jika limit switch ter-trigger (wadah penuh), semua motor langsung dimatikan
- **WiFi Recovery**: Jika 5 request gagal berturut-turut, WiFi disconnect + reconnect
- **Timeout**: HTTP request timeout 3 detik untuk menghindari blocking

---

## Web Dashboard (Next.js)

### Halaman Utama (`page.tsx`)

Layout dashboard terbagi menjadi 4 section:

#### 📊 Section 1: Monitoring
- **SensorChart** (×2) — Grafik area realtime untuk suhu dan kelembaban
  - Menggunakan Recharts `AreaChart` dengan gradient fill
  - Menampilkan 20 data terakhir
  - Realtime subscription: `INSERT` pada tabel `readings`
- **SensorStatus** — Status limit switch
  - 3 state: Penuh (hijau), Mengisi (kuning), Siaga (abu-abu)
  - Menampilkan status motor (berjalan/berhenti)

#### 🎮 Section 2: Kontrol Manual
- **PakanControl** — Kontrol motor pakan (tabel `relays`, type `FEEDER`)
  - Tombol arah: Kiri (BACKWARD) / Kanan (FORWARD)
  - Tombol START/STOP
  - Arah tidak bisa diubah saat motor nyala
  - Setiap toggle menulis log ke tabel `logs`
- **KotoranControl** — Kontrol motor kotoran (tabel `relays`, type `CLEANER`)
  - Fungsi identik dengan PakanControl

#### ⏰ Section 3: Penjadwalan
- **ScheduleManager** — Sistem penjadwalan otomatis
  - **Tabs**: Pakan / Kotoran
  - **2 Mode**:
    - *Waktu Tetap*: set jam:menit spesifik (contoh: 08:00)
    - *Interval*: setiap X menit (pilihan: 15m, 30m, 1j, 2j, 4j, 6j)
  - **Form**: pilih mode, waktu/interval, durasi nyala, arah, label
  - **Auto-trigger**: cek setiap 30 detik
    - Mode fixed: cocokkan jam:menit sekarang dengan jadwal
    - Mode interval: hitung selisih dari `last_triggered_at`
  - **Auto-stop**: matikan relay otomatis setelah `duration_seconds`
  - **CRUD**: tambah, toggle aktif/nonaktif, hapus jadwal

#### 📋 Section 4: System Log
- **SystemLog** — Terminal-style log viewer
  - Tampilan terminal dengan header macOS-style
  - Realtime subscription: `INSERT` pada tabel `logs`
  - Menampilkan 8 log terakhir dengan warna berdasarkan type

### Komponen Pendukung
- **DeviceStatus** — Badge online/offline ESP32
  - Cek `sensor_status.created_at` terakhir setiap 5 detik
  - Online jika last update < 30 detik
- **ThemeToggle** — Toggle dark/light mode (next-themes)
- **SceneryBackground** — Animasi background (siang: langit biru + bukit hijau, malam: langit gelap)

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
