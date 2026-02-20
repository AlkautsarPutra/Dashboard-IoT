"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Loader2, Play, Square, RotateCcw, RotateCw } from "lucide-react"

export default function KotoranControl() {
  const [loading, setLoading] = useState(false)
  const [isOn, setIsOn] = useState(false)
  const [direction, setDirection] = useState<'FORWARD' | 'BACKWARD'>('FORWARD')

  const fetchState = useCallback(async () => {
    const { data } = await supabase
      .from('relays')
      .select('*')
      .eq('type', 'CLEANER')
      .single()
    
    if (data) {
      setIsOn(data.is_on)
      setDirection(data.direction || 'FORWARD')
    }
  }, [])

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 2000)
    return () => clearInterval(interval)
  }, [fetchState])

  const toggleMotor = async () => {
    setLoading(true)
    try {
      const newState = !isOn
      const { error } = await supabase
        .from('relays')
        .update({ is_on: newState, direction })
        .eq('type', 'CLEANER')

      if (error) throw error
      setIsOn(newState)
      
      await supabase.from('logs').insert({
        message: `Kotoran ${newState ? 'ON' : 'OFF'} - ${direction}`,
        type: 'INFO'
      })
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const changeDirection = async (dir: 'FORWARD' | 'BACKWARD') => {
    if (isOn) return
    try {
      await supabase
        .from('relays')
        .update({ direction: dir })
        .eq('type', 'CLEANER')
      
      setDirection(dir)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  return (
    <Card className="h-full border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧹</span>
          <CardTitle className="text-sm font-semibold">Kotoran</CardTitle>
        </div>
        <Badge variant={isOn ? 'success' : 'secondary'} className="text-[10px] px-2 py-0.5">
          {isOn ? 'ON' : 'OFF'}
        </Badge>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex flex-col gap-3">
          {/* Direction Controls */}
          <div className="flex gap-2">
            <Button 
              size="sm"
              variant={direction === 'BACKWARD' ? 'default' : 'outline'}
              className="flex-1 h-8 text-xs"
              onClick={() => changeDirection('BACKWARD')}
              disabled={isOn}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Kiri
            </Button>
            <Button 
              size="sm"
              variant={direction === 'FORWARD' ? 'default' : 'outline'}
              className="flex-1 h-8 text-xs"
              onClick={() => changeDirection('FORWARD')}
              disabled={isOn}
            >
              <RotateCw className="h-3.5 w-3.5 mr-1" />
              Kanan
            </Button>
          </div>
          
          {/* ON/OFF Button */}
          <Button 
            className="w-full h-10" 
            size="sm"
            variant={isOn ? "destructive" : "default"}
            onClick={toggleMotor}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : isOn ? (
              <>
                <Square className="mr-1.5 h-4 w-4" /> STOP
              </>
            ) : (
              <>
                <Play className="mr-1.5 h-4 w-4" /> START
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
