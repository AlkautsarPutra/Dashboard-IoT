"use client"

import { ThemeToggle } from "@/components/ui/theme-toggle"
import SceneryBackground from "@/components/SceneryBackground"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function AnimasiPage() {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Animated Background Scenery - Full Screen */}
      <SceneryBackground />
      
      {/* Minimal Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/30 backdrop-blur-xl dark:bg-black/30 dark:border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-400">
              Scenery Animation
            </h1>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Empty main content - just to show the background */}
      <main className="flex-1 relative z-10">
        {/* Optional: Add a hint text */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
          <p className="text-sm text-white/60 dark:text-white/40 bg-black/20 dark:bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
            Toggle theme to see Day ☀️ / Night 🌙 animations
          </p>
        </div>
      </main>
    </div>
  )
}
