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
