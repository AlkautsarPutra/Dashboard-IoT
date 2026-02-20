"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import type { Schedule } from "@/types"
import { 
  Clock, Plus, Trash2, Timer, CalendarClock, 
  RotateCcw, RotateCw, Power, Loader2
} from "lucide-react"

type TabType = 'FEEDER' | 'CLEANER'
type ModeType = 'fixed' | 'interval'

export default function ScheduleManager() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('FEEDER')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  
  // Form state
  const [mode, setMode] = useState<ModeType>('fixed')
  const [time, setTime] = useState('08:00')
  const [intervalMin, setIntervalMin] = useState(60)
  const [direction, setDirection] = useState<'FORWARD' | 'BACKWARD'>('FORWARD')
  const [duration, setDuration] = useState(30)
  const [label, setLabel] = useState('')

  // Scheduler ref
  const schedulerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchSchedules = useCallback(async () => {
    const { data } = await supabase
      .from('schedules')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (data) setSchedules(data as Schedule[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSchedules()

    const channel = supabase
      .channel('schedules_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        () => fetchSchedules()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchSchedules])

  // Auto-trigger scheduler
  useEffect(() => {
    const checkSchedules = async () => {
      const now = new Date()
      const currentTime = now.toTimeString().slice(0, 5) // HH:MM

      for (const schedule of schedules) {
        if (!schedule.is_active) continue

        let shouldTrigger = false

        if (schedule.schedule_mode === 'fixed' && schedule.schedule_time) {
          const schedTime = schedule.schedule_time.slice(0, 5)
          if (schedTime === currentTime) {
            // Check if already triggered this minute
            if (schedule.last_triggered_at) {
              const lastTriggered = new Date(schedule.last_triggered_at)
              const diffMs = now.getTime() - lastTriggered.getTime()
              if (diffMs < 60000) continue // Already triggered within this minute
            }
            shouldTrigger = true
          }
        }

        if (schedule.schedule_mode === 'interval' && schedule.interval_minutes) {
          if (schedule.last_triggered_at) {
            const lastTriggered = new Date(schedule.last_triggered_at)
            const diffMin = (now.getTime() - lastTriggered.getTime()) / 60000
            if (diffMin >= schedule.interval_minutes) {
              shouldTrigger = true
            }
          } else {
            // Never triggered — trigger now
            shouldTrigger = true
          }
        }

        if (shouldTrigger) {
          try {
            // Turn on the relay
            const relayType = schedule.relay_type
            await supabase
              .from('relays')
              .update({ is_on: true, direction: schedule.direction })
              .eq('type', relayType)

            // Update last_triggered_at
            await supabase
              .from('schedules')
              .update({ last_triggered_at: now.toISOString() })
              .eq('id', schedule.id)

            // Log the event
            const labelName = relayType === 'FEEDER' ? 'Pakan' : 'Kotoran'
            await supabase.from('logs').insert({
              message: `⏰ Jadwal ${labelName}: ON (${schedule.duration_seconds}s) - ${schedule.direction}`,
              type: 'INFO'
            })

            // Auto-stop after duration
            setTimeout(async () => {
              await supabase
                .from('relays')
                .update({ is_on: false })
                .eq('type', relayType)

              await supabase.from('logs').insert({
                message: `⏰ Jadwal ${labelName}: OFF (auto-stop)`,
                type: 'SUCCESS'
              })
            }, schedule.duration_seconds * 1000)
          } catch (err) {
            console.error('Schedule trigger error:', err)
          }
        }
      }
    }

    schedulerRef.current = setInterval(checkSchedules, 30000)
    return () => {
      if (schedulerRef.current) clearInterval(schedulerRef.current)
    }
  }, [schedules])

  const addSchedule = async () => {
    setAdding(true)
    try {
      const newSchedule = {
        relay_type: activeTab,
        schedule_mode: mode,
        schedule_time: mode === 'fixed' ? time : null,
        interval_minutes: mode === 'interval' ? intervalMin : null,
        direction,
        duration_seconds: duration,
        is_active: true,
        label: label || null
      }

      const { error } = await supabase.from('schedules').insert(newSchedule)
      if (error) throw error

      setShowForm(false)
      setLabel('')
      fetchSchedules()

      const labelName = activeTab === 'FEEDER' ? 'Pakan' : 'Kotoran'
      await supabase.from('logs').insert({
        message: `Jadwal ${labelName} ditambahkan: ${mode === 'fixed' ? time : `setiap ${intervalMin} menit`}`,
        type: 'INFO'
      })
    } catch (err) {
      console.error('Error adding schedule:', err)
    } finally {
      setAdding(false)
    }
  }

  const toggleSchedule = async (id: number, isActive: boolean) => {
    await supabase
      .from('schedules')
      .update({ is_active: !isActive })
      .eq('id', id)
    fetchSchedules()
  }

  const deleteSchedule = async (id: number) => {
    await supabase.from('schedules').delete().eq('id', id)
    fetchSchedules()
  }

  const filteredSchedules = schedules.filter(s => s.relay_type === activeTab)

  const formatInterval = (minutes: number) => {
    if (minutes < 60) return `${minutes} menit`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours} jam`
    return `${hours} jam ${mins} menit`
  }

  return (
    <Card className="border-indigo-500/20">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-indigo-500" />
            <CardTitle className="text-sm font-semibold">Penjadwalan</CardTitle>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="h-3 w-3" />
            Tambah
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          <button
            onClick={() => setActiveTab('FEEDER')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'FEEDER'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            🌾 Pakan
          </button>
          <button
            onClick={() => setActiveTab('CLEANER')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'CLEANER'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            🧹 Kotoran
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
        {/* Add Form */}
        {showForm && (
          <div className="p-3 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
            {/* Mode Selection */}
            <div className="flex gap-1">
              <button
                onClick={() => setMode('fixed')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
                  mode === 'fixed'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white dark:bg-slate-800 text-muted-foreground border'
                }`}
              >
                <Clock className="h-3 w-3" />
                Waktu Tetap
              </button>
              <button
                onClick={() => setMode('interval')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
                  mode === 'interval'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white dark:bg-slate-800 text-muted-foreground border'
                }`}
              >
                <Timer className="h-3 w-3" />
                Interval
              </button>
            </div>

            {/* Time / Interval Input */}
            {mode === 'fixed' ? (
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Waktu</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full h-8 px-2 text-xs rounded-md border bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ) : (
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Setiap (menit)</label>
                <div className="flex gap-1">
                  {[15, 30, 60, 120, 240, 360].map((m) => (
                    <button
                      key={m}
                      onClick={() => setIntervalMin(m)}
                      className={`flex-1 py-1 rounded-md text-[10px] font-medium transition-all ${
                        intervalMin === m
                          ? 'bg-indigo-500 text-white'
                          : 'bg-white dark:bg-slate-800 text-muted-foreground border'
                      }`}
                    >
                      {m < 60 ? `${m}m` : `${m / 60}j`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Duration */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Durasi Nyala (detik)</label>
              <div className="flex gap-1">
                {[10, 15, 30, 45, 60, 120].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-1 rounded-md text-[10px] font-medium transition-all ${
                      duration === d
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white dark:bg-slate-800 text-muted-foreground border'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Direction */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Arah</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setDirection('BACKWARD')}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
                    direction === 'BACKWARD'
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-black'
                      : 'bg-white dark:bg-slate-800 text-muted-foreground border'
                  }`}
                >
                  <RotateCcw className="h-3 w-3" />
                  Kiri
                </button>
                <button
                  onClick={() => setDirection('FORWARD')}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
                    direction === 'FORWARD'
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-black'
                      : 'bg-white dark:bg-slate-800 text-muted-foreground border'
                  }`}
                >
                  <RotateCw className="h-3 w-3" />
                  Kanan
                </button>
              </div>
            </div>

            {/* Label (optional) */}
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Label (opsional)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Contoh: Pakan Pagi"
                className="w-full h-8 px-2 text-xs rounded-md border bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Submit */}
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              onClick={addSchedule}
              disabled={adding}
            >
              {adding ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Plus className="h-3 w-3 mr-1" />
              )}
              Simpan Jadwal
            </Button>
          </div>
        )}

        {/* Schedule List */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Belum ada jadwal untuk {activeTab === 'FEEDER' ? 'Pakan' : 'Kotoran'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                  schedule.is_active
                    ? 'bg-white dark:bg-slate-900 border-border'
                    : 'bg-muted/50 border-transparent opacity-60'
                }`}
              >
                {/* Icon */}
                <div className={`p-1.5 rounded-md ${
                  schedule.schedule_mode === 'fixed'
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'bg-purple-500/10 text-purple-500'
                }`}>
                  {schedule.schedule_mode === 'fixed' ? (
                    <Clock className="h-3.5 w-3.5" />
                  ) : (
                    <Timer className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">
                      {schedule.schedule_mode === 'fixed'
                        ? schedule.schedule_time?.slice(0, 5)
                        : `Setiap ${formatInterval(schedule.interval_minutes || 0)}`
                      }
                    </span>
                    {schedule.label && (
                      <span className="text-[10px] text-muted-foreground truncate">
                        {schedule.label}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                    <span>{schedule.duration_seconds}s</span>
                    <span>•</span>
                    <span>{schedule.direction === 'FORWARD' ? 'Kanan' : 'Kiri'}</span>
                    {schedule.schedule_mode === 'interval' && schedule.last_triggered_at && (
                      <>
                        <span>•</span>
                        <span>
                          Terakhir: {new Date(schedule.last_triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleSchedule(schedule.id, schedule.is_active)}
                    className={`p-1.5 rounded-md transition-all ${
                      schedule.is_active
                        ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                        : 'bg-slate-500/10 text-slate-400 hover:bg-slate-500/20'
                    }`}
                  >
                    <Power className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => deleteSchedule(schedule.id)}
                    className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
