"use client"

import { useEffect, useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import type { SensorReading } from "@/types"

interface SensorChartProps {
  type: 'temperature' | 'humidity'
  title: string
  color: string
}

export default function SensorChart({ type, title, color }: SensorChartProps) {
  const [data, setData] = useState<SensorReading[]>([])

  useEffect(() => {
    // Initial fetch
    const fetchData = async () => {
      const { data: readings } = await supabase
        .from('readings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (readings) {
        // Reverse to show oldest to newest left to right
        setData((readings as SensorReading[]).reverse())
      }
    }

    fetchData()

    // Realtime subscription
    const channel = supabase
      .channel('readings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'readings' },
        (payload) => {
          setData((current) => {
            const newData = [...current, payload.new as SensorReading]
            if (newData.length > 20) newData.shift()
            return newData
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const latestValue = data.length > 0 ? data[data.length - 1][type] : 0

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-lg font-bold">
          {latestValue.toFixed(1)} {type === 'temperature' ? '°C' : '%'}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`color${type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="created_at" 
                tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                minTickGap={40}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                hide
              />
              <YAxis 
                 domain={type === 'temperature' ? [20, 40] : [0, 100]} 
                 fontSize={10}
                 tickLine={false}
                 axisLine={false}
                 hide
              />
              <Tooltip 
                labelFormatter={(label) => new Date(label).toLocaleString()}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
              />
              <Area 
                type="monotone" 
                dataKey={type} 
                stroke={color} 
                fillOpacity={1} 
                fill={`url(#color${type})`} 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
