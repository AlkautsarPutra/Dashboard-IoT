"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Loader2, Trash2, StopCircle } from "lucide-react"

export default function CleanerControl() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'IDLE' | 'CLEANING'>('IDLE')

  const toggleCleaner = async () => {
    setLoading(true)
    const newStatus = status === 'IDLE' ? 'CLEANING' : 'IDLE'
    
    try {
      const { error } = await supabase
        .from('relays')
        .update({ is_on: newStatus === 'CLEANING' })
        .eq('type', 'CLEANER')

      if (error) throw error

      setStatus(newStatus)
       // Log the action
       await supabase.from('logs').insert({
        message: `Waste cleaning ${newStatus === 'CLEANING' ? 'started' : 'stopped'}`,
        type: 'INFO'
      })

    } catch (err: any) {
      console.error('Error toggling cleaner:', err.message || err)
      alert('Error: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">Cleaner</CardTitle>
        <Badge variant={status === 'CLEANING' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0">
          {status}
        </Badge>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex flex-col gap-2">
          <div className="text-sm font-bold">Conveyor Belt</div>
          <Button 
            className="w-full h-8 text-xs" 
            size="sm"
            variant={status === 'CLEANING' ? "secondary" : "outline"}
            onClick={toggleCleaner}
            disabled={loading}
          >
             {loading ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : status === 'IDLE' ? (
              <>
                <Trash2 className="mr-1 h-3 w-3" /> Start
              </>
            ) : (
              <>
                <StopCircle className="mr-1 h-3 w-3" /> Stop
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
