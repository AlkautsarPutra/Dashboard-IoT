"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Wifi, WifiOff } from "lucide-react"

export default function DeviceStatus() {
  const [isOnline, setIsOnline] = useState(false)
  const [lastSeen, setLastSeen] = useState<Date | null>(null)

  const checkStatus = useCallback(async () => {
    const { data } = await supabase
      .from('sensor_status')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (data) {
      const lastUpdate = new Date(data.created_at)
      setLastSeen(lastUpdate)
      
      // Consider online if last update within 30 seconds
      const diff = (Date.now() - lastUpdate.getTime()) / 1000
      setIsOnline(diff < 30)
    } else {
      setIsOnline(false)
    }
  }, [])

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [checkStatus])

  const formatLastSeen = () => {
    if (!lastSeen) return "Never"
    const diff = Math.floor((Date.now() - lastSeen.getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
      isOnline 
        ? 'bg-green-500/10 border-green-500/20' 
        : 'bg-red-500/10 border-red-500/20'
    }`}>
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3 text-green-500" />
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-green-700 dark:text-green-400">
            ESP32 Online
          </span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 text-red-500" />
          <span className="text-xs font-medium text-red-700 dark:text-red-400">
            ESP32 Offline
          </span>
          <span className="text-[10px] text-muted-foreground">
            ({formatLastSeen()})
          </span>
        </>
      )}
    </div>
  )
}
