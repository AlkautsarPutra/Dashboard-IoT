"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Loader2, Play, Square, RotateCcw, RotateCw } from "lucide-react"

export default function FeederControl() {
  const [loading, setLoading] = useState(false)
  const [isOn, setIsOn] = useState(false)
  const [direction, setDirection] = useState<'FORWARD' | 'BACKWARD'>('FORWARD')

  const fetchState = useCallback(async () => {
    const { data } = await supabase
      .from('relays')
      .select('*')
      .eq('type', 'FEEDER')
      .single()
    
    if (data) {
      setIsOn(data.is_on)
      setDirection(data.direction || 'FORWARD')
    }
  }, [])

  useEffect(() => {
    fetchState()
    // Poll for updates every 2 seconds
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
        .eq('type', 'FEEDER')

      if (error) throw error
      setIsOn(newState)
      
      await supabase.from('logs').insert({
        message: `Feeder ${newState ? 'ON' : 'OFF'} - ${direction}`,
        type: 'INFO'
      })
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const changeDirection = async (dir: 'FORWARD' | 'BACKWARD') => {
    if (isOn) return // Cannot change direction while running
    try {
      await supabase
        .from('relays')
        .update({ direction: dir })
        .eq('type', 'FEEDER')
      
      setDirection(dir)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">Feeder (Auger)</CardTitle>
        <Badge variant={isOn ? 'success' : 'secondary'} className="text-[10px] px-1.5 py-0">
          {isOn ? 'ON' : 'OFF'}
        </Badge>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex flex-col gap-2">
          {/* Direction Controls */}
          <div className="flex gap-1">
            <Button 
              size="sm"
              variant={direction === 'BACKWARD' ? 'default' : 'outline'}
              className="flex-1 h-7 text-[10px]"
              onClick={() => changeDirection('BACKWARD')}
              disabled={isOn}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Kiri
            </Button>
            <Button 
              size="sm"
              variant={direction === 'FORWARD' ? 'default' : 'outline'}
              className="flex-1 h-7 text-[10px]"
              onClick={() => changeDirection('FORWARD')}
              disabled={isOn}
            >
              <RotateCw className="h-3 w-3 mr-1" />
              Kanan
            </Button>
          </div>
          
          {/* ON/OFF Button */}
          <Button 
            className="w-full h-9" 
            size="sm"
            variant={isOn ? "destructive" : "default"}
            onClick={toggleMotor}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : isOn ? (
              <>
                <Square className="mr-1 h-4 w-4" /> STOP
              </>
            ) : (
              <>
                <Play className="mr-1 h-4 w-4" /> START
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
