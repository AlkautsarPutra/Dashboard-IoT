"use client"

import { motion } from "framer-motion"
import SensorChart from "@/components/dashboard/SensorChart"
import FeederControl from "@/components/dashboard/FeederControl"
import CleanerControl from "@/components/dashboard/CleanerControl"
import SensorStatus from "@/components/dashboard/SensorStatus"
import DeviceStatus from "@/components/dashboard/DeviceStatus"
import SystemLogComponent from "@/components/dashboard/SystemLog"
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
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/50 backdrop-blur-xl dark:bg-black/50 dark:border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-white font-bold">IoT</span>
             </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-400">
              Smart Poultry
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <DeviceStatus />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content - Compact & Centered */}
      <main className="relative z-10 flex-1 p-3 md:p-4 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Top Row: Status Cards Grid */}
          <motion.div 
            className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item} className="col-span-1">
              <SensorChart 
                type="temperature" 
                title="Temperature" 
                color="#ef4444" 
              />
            </motion.div>
            <motion.div variants={item} className="col-span-1">
              <SensorChart 
                type="humidity" 
                title="Humidity" 
                color="#3b82f6" 
              />
            </motion.div>
            <motion.div variants={item} className="col-span-1">
              <SensorStatus />
            </motion.div>
            <motion.div variants={item} className="col-span-1">
              <FeederControl />
            </motion.div>
            <motion.div variants={item} className="col-span-1">
              <CleanerControl />
            </motion.div>
          </motion.div>

          {/* Bottom Row: System Logs - Compact */}
          <motion.div 
            variants={item}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <SystemLogComponent />
          </motion.div>
        </div>
      </main>
    </div>
  )
}
