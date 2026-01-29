"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Loader2, Play, Square } from "lucide-react"

export default function FeederControl() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'IDLE' | 'FEEDING'>('IDLE')

  const toggleFeed = async () => {
    setLoading(true)
    const newStatus = status === 'IDLE' ? 'FEEDING' : 'IDLE'
    
    // In a real scenario, we would update the 'relays' table for the Feeder device
    // ensuring we map to the correct device_id and relay type
    try {
      const { error } = await supabase
        .from('relays')
        .update({ is_on: newStatus === 'FEEDING' })
        .eq('type', 'FEEDER') // Assuming we have a unique constraint or we pick the first one

      if (error) throw error

      setStatus(newStatus)
      
      // Log the action
      await supabase.from('logs').insert({
        message: `Manual feeding ${newStatus === 'FEEDING' ? 'started' : 'stopped'}`,
        type: 'INFO'
      })

    } catch (err: any) {
      console.error('Error toggling feeder:', err.message || err)
      alert('Error: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">Feeder</CardTitle>
        <Badge variant={status === 'FEEDING' ? 'success' : 'secondary'} className="text-[10px] px-1.5 py-0">
          {status}
        </Badge>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex flex-col gap-2">
          <div className="text-sm font-bold">Auger System</div>
          <Button 
            className="w-full h-8 text-xs" 
            size="sm"
            variant={status === 'FEEDING' ? "destructive" : "default"}
            onClick={toggleFeed}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : status === 'IDLE' ? (
              <>
                <Play className="mr-1 h-3 w-3" /> Start
              </>
            ) : (
              <>
                <Square className="mr-1 h-3 w-3" /> Stop
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
