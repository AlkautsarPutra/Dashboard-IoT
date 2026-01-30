"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Gauge, CircleDot, Loader2 } from "lucide-react"

interface SensorData {
  id: number
  created_at: string
  device_id: string
  sensor_name: string
  is_triggered: boolean
  motors_running: boolean
}

export default function SensorStatus() {
  const [status, setStatus] = useState<SensorData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial fetch - get latest sensor status
    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('sensor_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (data && !error) {
        setStatus(data as SensorData)
      }
      setLoading(false)
    }

    fetchStatus()

    // Realtime subscription for sensor updates
    const channel = supabase
      .channel('sensor_status')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_status' },
        (payload) => {
          setStatus(payload.new as SensorData)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const isFull = status?.is_triggered ?? false
  const isRunning = status?.motors_running ?? false

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          Feed Status
        </CardTitle>
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : (
          <Badge 
            variant={isFull ? "success" : isRunning ? "warning" : "secondary"} 
            className="text-[10px] px-1.5 py-0"
          >
            {isFull ? "FULL" : isRunning ? "FILLING" : "IDLE"}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${
              isFull 
                ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                : isRunning 
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
            }`}>
              <Gauge className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">
                {isFull ? "Container Full" : isRunning ? "Filling..." : "Standby"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Limit Switch Sensor
              </div>
            </div>
          </div>
          
          {/* Motor Status Indicator */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
            <CircleDot className={`h-3 w-3 ${
              isRunning 
                ? 'text-green-500 animate-pulse' 
                : 'text-slate-400'
            }`} />
            <span className="text-xs text-muted-foreground">
              Motors: <span className={isRunning ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                {isRunning ? "Running" : "Stopped"}
              </span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
