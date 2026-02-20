"use client"

import { motion } from "framer-motion"
import SensorChart from "@/components/dashboard/SensorChart"
import PakanControl from "@/components/dashboard/PakanControl"
import KotoranControl from "@/components/dashboard/KotoranControl"
import SensorStatus from "@/components/dashboard/SensorStatus"
import DeviceStatus from "@/components/dashboard/DeviceStatus"
import SystemLogComponent from "@/components/dashboard/SystemLog"
import ScheduleManager from "@/components/dashboard/ScheduleManager"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import SceneryBackground from "@/components/SceneryBackground"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Animated Background Scenery */}
      <SceneryBackground />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl dark:bg-black/60 dark:border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white text-[10px] font-bold">🐔</span>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-400">
                SiKayPin
              </h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block">Sistem Informasi Kandang Ayam Pintar</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DeviceStatus />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 p-3 md:p-4 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          
          {/* Section 1: Monitoring — Sensor Cards */}
          <motion.section
            variants={container}
            initial="hidden"
            animate="show"
          >
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              📊 Monitoring
            </h2>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <motion.div variants={item}>
                <SensorChart 
                  type="temperature" 
                  title="Suhu" 
                  color="#ef4444" 
                />
              </motion.div>
              <motion.div variants={item}>
                <SensorChart 
                  type="humidity" 
                  title="Kelembaban" 
                  color="#3b82f6" 
                />
              </motion.div>
              <motion.div variants={item} className="sm:col-span-2 lg:col-span-1">
                <SensorStatus />
              </motion.div>
            </div>
          </motion.section>

          {/* Section 2: Kontrol Manual */}
          <motion.section
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              🎮 Kontrol Manual
            </h2>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <motion.div variants={item}>
                <PakanControl />
              </motion.div>
              <motion.div variants={item}>
                <KotoranControl />
              </motion.div>
            </div>
          </motion.section>

          {/* Section 3: Penjadwalan */}
          <motion.section
            variants={item}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              ⏰ Penjadwalan
            </h2>
            <ScheduleManager />
          </motion.section>

          {/* Section 4: System Log */}
          <motion.section
            variants={item}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              📋 System Log
            </h2>
            <SystemLogComponent />
          </motion.section>
        </div>
      </main>
    </div>
  )
}
