"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import type { SystemLog } from "@/types"

export default function SystemLogComponent() {
  const [logs, setLogs] = useState<SystemLog[]>([])

  useEffect(() => {
    // Initial fetch (mock data for now if DB empty)
    const fetchLogs = async () => {
       const { data } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (data) setLogs(data as SystemLog[])
    }

    fetchLogs()

    // Real-time subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'logs',
        },
        (payload) => {
          setLogs((current) => [payload.new as SystemLog, ...current].slice(0, 10))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="rounded-lg overflow-hidden border border-green-500/30 shadow-lg">
      {/* Terminal Header Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border-b border-gray-700">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        </div>
        <span className="text-[10px] text-gray-400 font-mono">system@sikaypin:~</span>
      </div>
      
      {/* Terminal Content */}
      <div className="bg-gray-900/95 backdrop-blur-sm p-3 font-mono text-xs max-h-[150px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-gray-500">
            <span className="text-green-400">$</span> No logs available...
          </div>
        ) : (
          logs.slice(0, 8).map((log, index) => (
            <div key={log.id} className="flex items-start gap-2 mb-1 last:mb-0">
              <span className="text-gray-500 select-none shrink-0">
                [{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
              </span>
              <span className={`shrink-0 ${
                log.type === 'ERROR' ? 'text-red-400' : 
                log.type === 'SUCCESS' ? 'text-green-400' : 
                'text-blue-400'
              }`}>
                [{log.type}]
              </span>
              <span className="text-gray-200 break-all">{log.message}</span>
            </div>
          ))
        )}
        {/* Blinking cursor */}
        <div className="flex items-center gap-1 mt-2 text-green-400">
          <span>$</span>
          <span className="w-2 h-4 bg-green-400 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
