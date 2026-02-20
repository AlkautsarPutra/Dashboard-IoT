export interface SensorReading {
  id: number
  created_at: string
  temperature: number
  humidity: number
  device_id: string
}

export type RelayType = 'FEEDER' | 'CLEANER' | 'LIGHT' | 'FAN' | 'OTHER'

export interface RelayState {
  id: number
  created_at?: string
  name: string
  is_on: boolean
  type: RelayType
  device_id: string
}

export interface SystemLog {
  id: number
  created_at: string
  message: string
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
}

export interface Schedule {
  id: number
  created_at?: string
  relay_type: 'FEEDER' | 'CLEANER'
  schedule_mode: 'fixed' | 'interval'
  schedule_time?: string
  interval_minutes?: number
  direction: 'FORWARD' | 'BACKWARD'
  duration_seconds: number
  is_active: boolean
  last_triggered_at?: string
  label?: string
}
