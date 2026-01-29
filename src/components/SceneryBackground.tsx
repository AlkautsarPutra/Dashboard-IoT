"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"

// Generate varied stars - different colors and sizes for realism
const generateStars = (count: number) => {
  const colors = [
    "rgba(255, 255, 255, 1)",
    "rgba(200, 220, 255, 1)",
    "rgba(255, 240, 220, 1)",
    "rgba(180, 200, 255, 1)",
    "rgba(255, 220, 180, 1)",
  ]
  
  return Array.from({ length: count }, (_, i) => {
    const size = Math.random()
    return {
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 60,
      size: size < 0.7 ? Math.random() * 1.2 + 0.3 : size < 0.9 ? Math.random() * 1.5 + 1 : Math.random() * 2 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      twinkleDuration: Math.random() * 5 + 3,
      twinkleDelay: Math.random() * 8,
      brightness: Math.random() * 0.5 + 0.5,
    }
  })
}

const generateClouds = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    y: Math.random() * 35 + 20,
    scale: Math.random() * 0.5 + 0.4,
    duration: Math.random() * 80 + 80,
    delay: (i / count) * -80,
    layers: Math.floor(Math.random() * 3) + 4,
  }))
}

const stars = generateStars(150)
const clouds = generateClouds(8)
const meteorCount = 6

export default function SceneryBackground() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="fixed inset-0 -z-10 bg-background" />
  }

  const isDark = resolvedTheme === "dark"

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {isDark ? (
        /* ===== NIGHT MODE ===== */
        <div className="absolute inset-0">
          {/* Deep space gradient */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 120% 80% at 80% 20%, rgba(20, 30, 80, 0.5) 0%, transparent 50%),
                radial-gradient(ellipse 100% 60% at 20% 80%, rgba(40, 20, 60, 0.4) 0%, transparent 40%),
                linear-gradient(180deg, #0a0c1a 0%, #0d1025 30%, #080a15 70%, #020305 100%)
              `,
            }}
          />

          {/* Atmospheric glow - horizon */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-[50%]"
            style={{
              background: "linear-gradient(to top, rgba(30, 50, 80, 0.2) 0%, transparent 100%)",
            }}
          />

          {/* Stars with realistic twinkling */}
          {stars.map((star) => (
            <motion.div
              key={star.id}
              className="absolute rounded-full"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.size,
                height: star.size,
                backgroundColor: star.color,
                boxShadow: star.size > 2 
                  ? `0 0 ${star.size * 3}px ${star.size}px ${star.color.replace('1)', '0.4)')}` 
                  : star.size > 1.2 
                    ? `0 0 ${star.size * 2}px ${star.color.replace('1)', '0.3)')}` 
                    : 'none',
              }}
              animate={{
                opacity: [star.brightness, star.brightness * 0.2, star.brightness],
              }}
              transition={{
                duration: star.twinkleDuration,
                repeat: Infinity,
                delay: star.twinkleDelay,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Meteor Shower */}
          {Array.from({ length: meteorCount }).map((_, i) => (
            <motion.div
              key={`meteor-${i}`}
              className="absolute"
              style={{
                top: `${5 + (i * 10) % 40}%`,
                left: `${10 + (i * 15) % 70}%`,
              }}
              animate={{
                x: [0, 250],
                y: [0, 150],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: 5 + i * 2.5,
                delay: i * 1.5,
                ease: "easeOut",
              }}
            >
              <div 
                style={{
                  width: 3,
                  height: 3,
                  background: "white",
                  borderRadius: "50%",
                  boxShadow: "0 0 10px 4px rgba(255, 255, 255, 0.9)",
                }}
              />
              <div 
                style={{
                  position: "absolute",
                  width: 80,
                  height: 2,
                  background: "linear-gradient(to left, rgba(255,255,255,0.95), rgba(200,220,255,0.6), transparent)",
                  right: 3,
                  top: 0.5,
                  borderRadius: 2,
                }}
              />
            </motion.div>
          ))}

          {/* Moon with realistic details */}
          <motion.div
            className="absolute top-10 right-[15%] w-20 h-20"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Moon glow */}
            <motion.div
              className="absolute rounded-full"
              style={{
                inset: -30,
                background: "radial-gradient(circle, rgba(220, 230, 250, 0.2) 0%, rgba(180, 200, 240, 0.05) 40%, transparent 70%)",
              }}
              animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Moon surface */}
            <div 
              className="absolute inset-0 rounded-full overflow-hidden"
              style={{
                background: `radial-gradient(circle at 35% 30%, #f8f8f5 0%, #e8e8e0 30%, #c8c8bc 60%, #98988c 100%)`,
                boxShadow: `
                  inset -6px -6px 15px rgba(0,0,0,0.4),
                  inset 3px 3px 10px rgba(255,255,255,0.2),
                  0 0 30px 8px rgba(200, 210, 230, 0.2)
                `,
              }}
            >
              {/* Mare (dark patches) */}
              <div className="absolute w-8 h-6 rounded-full bg-gradient-to-br from-gray-400/30 to-gray-500/20" style={{ top: "15%", left: "20%", transform: "rotate(-20deg)" }} />
              <div className="absolute w-6 h-5 rounded-full bg-gradient-to-br from-gray-400/25 to-gray-500/15" style={{ top: "45%", left: "50%" }} />
              <div className="absolute w-5 h-4 rounded-full bg-gradient-to-br from-gray-400/20 to-gray-500/10" style={{ top: "60%", left: "25%" }} />
              
              {/* Craters */}
              <div className="absolute w-2.5 h-2.5 rounded-full" style={{ top: "25%", left: "55%", boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.3)" }} />
              <div className="absolute w-2 h-2 rounded-full" style={{ top: "50%", left: "35%", boxShadow: "inset 0.5px 0.5px 1px rgba(0,0,0,0.25)" }} />
              <div className="absolute w-3 h-3 rounded-full" style={{ top: "70%", left: "60%", boxShadow: "inset 1px 1px 3px rgba(0,0,0,0.2)" }} />
            </div>

            {/* Terminator shadow */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(100deg, transparent 45%, rgba(0,0,10,0.6) 55%, rgba(0,0,10,0.85) 100%)",
              }}
            />
          </motion.div>

          {/* Nebula dust */}
          <motion.div
            className="absolute"
            style={{
              top: "5%",
              left: "5%",
              width: 400,
              height: 250,
              background: "radial-gradient(ellipse, rgba(80, 50, 120, 0.15) 0%, rgba(60, 40, 100, 0.08) 30%, transparent 60%)",
              filter: "blur(30px)",
              transform: "rotate(-15deg)",
            }}
            animate={{ opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* ===== FARM SCENE (NIGHT) ===== */}
          {/* Far Mountains */}
          <div className="absolute bottom-[18%] left-0 right-0">
            <svg viewBox="0 0 1440 180" className="w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="farMtnNight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>
              <polygon fill="url(#farMtnNight)" points="0,180 100,100 250,140 400,60 550,120 700,40 850,90 1000,30 1150,70 1300,50 1440,100 1440,180" />
            </svg>
          </div>

          {/* Near Mountains */}
          <div className="absolute bottom-[15%] left-0 right-0">
            <svg viewBox="0 0 1440 150" className="w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="nearMtnNight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
              </defs>
              <polygon fill="url(#nearMtnNight)" points="0,150 80,80 200,110 350,50 500,90 650,30 800,70 950,40 1100,80 1250,60 1350,100 1440,70 1440,150" />
            </svg>
          </div>

          {/* Ground */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-[15%]"
            style={{ background: 'linear-gradient(to bottom, #064e3b 0%, #052e16 50%, #022c22 100%)' }}
          />

          {/* Chicken Coop with lit windows */}
          <div className="absolute bottom-[15%] right-[12%]">
            <div className="w-28 h-16 bg-amber-900 rounded-sm" />
            <div 
              className="absolute -top-7 -left-2 w-0 h-0"
              style={{
                borderLeft: '64px solid transparent',
                borderRight: '64px solid transparent',
                borderBottom: '28px solid #78350f'
              }}
            />
            <div className="absolute top-3 left-3 w-5 h-4 bg-yellow-300 rounded-sm shadow-[0_0_15px_rgba(255,200,0,0.6)]" />
            <div className="absolute top-3 right-3 w-5 h-4 bg-yellow-300 rounded-sm shadow-[0_0_15px_rgba(255,200,0,0.6)]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-9 bg-amber-950 rounded-t" />
            {/* Fence */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="absolute bottom-0 w-1.5 h-7 bg-amber-800" style={{ left: `${-18 + i * 10}px` }} />
            ))}
            <div className="absolute bottom-3 -left-5 w-10 h-1 bg-amber-700" />
          </div>

          {/* Sleeping Chickens + Zzz */}
          <div className="absolute bottom-[17%] right-[14%]">
            <motion.div 
              className="absolute -top-4 left-0 text-white/70 text-xs font-bold"
              animate={{ y: [0, -6, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >Z</motion.div>
            <motion.div 
              className="absolute -top-6 left-2 text-white/50 text-[10px] font-bold"
              animate={{ y: [0, -6, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            >z</motion.div>
            <motion.div 
              className="absolute -top-7 left-4 text-white/30 text-[8px] font-bold"
              animate={{ y: [0, -6, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
            >z</motion.div>
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2.5 h-1.5 bg-white/50 rounded-full" />
              ))}
            </div>
          </div>

          {/* Shepherd chasing with flashlight */}
          <motion.div
            className="absolute bottom-[16%] left-[10%]"
            animate={{ x: [0, 100, 120, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="relative">
              {/* Shadow */}
              <div className="absolute -bottom-1 left-1 w-5 h-2 bg-black/30 rounded-full blur-sm" />
              {/* Hat */}
              <div className="absolute -top-2 left-0.5 w-4 h-1.5 bg-amber-700 rounded-full" />
              {/* Head */}
              <div className="w-4 h-4 bg-amber-200 rounded-full mx-auto" />
              {/* Body */}
              <div className="w-5 h-8 bg-blue-800 rounded-t-lg mx-auto -mt-0.5" />
              {/* Legs */}
              <div className="flex justify-center gap-0.5">
                <motion.div 
                  className="w-1 h-4 bg-gray-700"
                  animate={{ rotate: [-15, 15, -15] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                />
                <motion.div 
                  className="w-1 h-4 bg-gray-700"
                  animate={{ rotate: [15, -15, 15] }}
                  transition={{ duration: 0.3, repeat: Infinity }}
                />
              </div>
              {/* Flashlight pointing right */}
              <div className="absolute top-2 -right-4 w-0.5 h-10 bg-gray-400 rounded" style={{ transform: 'rotate(-20deg)' }} />
              {/* Light beam */}
              <div 
                className="absolute top-4 -right-20 w-20 h-12 opacity-30"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,255,180,0.9) 0%, rgba(255,255,180,0.3) 50%, transparent 100%)',
                  clipPath: 'polygon(0% 25%, 100% 0, 100% 100%, 0% 75%)',
                  filter: 'blur(2px)'
                }}
              />
            </div>
          </motion.div>

          {/* Wolf sneaking */}
          <motion.div
            className="absolute bottom-[16%] left-[35%]"
            animate={{ x: [0, 60, 40, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="relative">
              {/* Shadow */}
              <div className="absolute -bottom-1 left-2 w-8 h-2 bg-black/30 rounded-full blur-sm" />
              {/* Body */}
              <div className="w-10 h-5 bg-gradient-to-b from-gray-500 to-gray-600 rounded-full" />
              {/* Head */}
              <div className="absolute -left-3 -top-0.5 w-5 h-4 bg-gradient-to-b from-gray-500 to-gray-600 rounded-full" />
              {/* Ears */}
              <div className="absolute -left-4 -top-3 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-gray-500" />
              <div className="absolute -left-1.5 -top-3 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-gray-500" />
              {/* Snout */}
              <div className="absolute -left-5 top-0.5 w-3 h-2 bg-gray-400 rounded-full" />
              {/* Glowing eye */}
              <motion.div 
                className="absolute -left-2 top-0 w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-[0_0_6px_rgba(255,200,0,0.9)]"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              {/* Tail */}
              <div className="absolute -right-3 -top-0.5 w-4 h-1.5 bg-gray-500 rounded-full transform -rotate-45" />
              {/* Legs */}
              <motion.div className="absolute -bottom-2 left-0.5 w-1 h-3 bg-gray-600" animate={{ rotate: [-10, 10, -10] }} transition={{ duration: 0.2, repeat: Infinity }} />
              <motion.div className="absolute -bottom-2 left-3 w-1 h-3 bg-gray-600" animate={{ rotate: [10, -10, 10] }} transition={{ duration: 0.2, repeat: Infinity }} />
              <motion.div className="absolute -bottom-2 right-0.5 w-1 h-3 bg-gray-600" animate={{ rotate: [-10, 10, -10] }} transition={{ duration: 0.2, repeat: Infinity }} />
              <motion.div className="absolute -bottom-2 right-3 w-1 h-3 bg-gray-600" animate={{ rotate: [10, -10, 10] }} transition={{ duration: 0.2, repeat: Infinity }} />
            </div>
          </motion.div>
        </div>
      ) : (
        /* ===== DAY MODE ===== */
        <div className="absolute inset-0">
          {/* Sky gradient */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 150% 100% at 85% 10%, rgba(255, 250, 220, 0.4) 0%, transparent 40%),
                linear-gradient(180deg, #2E7BC4 0%, #4A9BD9 15%, #6BB3E8 30%, #89C8F2 50%, #A8D9F8 70%, #C8E8FC 85%, #E5F4FF 100%)
              `,
            }}
          />

          {/* Atmospheric haze */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-[40%]"
            style={{ background: "linear-gradient(to top, rgba(255, 255, 255, 0.6) 0%, rgba(200, 230, 255, 0.2) 50%, transparent 100%)" }}
          />

          {/* Sun with corona */}
          <motion.div
            className="absolute top-10 right-[15%] w-20 h-20"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Outer glow */}
            <motion.div
              className="absolute rounded-full"
              style={{
                inset: -50,
                background: "radial-gradient(circle, rgba(255, 240, 180, 0.3) 0%, rgba(255, 200, 100, 0.1) 40%, transparent 70%)",
              }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <div
              className="absolute rounded-full"
              style={{
                inset: -25,
                background: "radial-gradient(circle, rgba(255, 230, 150, 0.5) 0%, rgba(255, 200, 80, 0.2) 50%, transparent 80%)",
              }}
            />
            
            {/* Sun core */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle at 40% 40%, #FFFEF0 0%, #FFF5D0 20%, #FFE580 50%, #FFCC00 80%, #FFA500 100%)",
                boxShadow: "0 0 80px 30px rgba(255, 200, 50, 0.5), 0 0 120px 60px rgba(255, 150, 0, 0.2)",
              }}
            />
          </motion.div>

          {/* Realistic volumetric clouds */}
          {clouds.map((cloud) => (
            <motion.div
              key={cloud.id}
              className="absolute pointer-events-none"
              style={{ top: `${cloud.y}%` }}
              initial={{ x: "-250px" }}
              animate={{ x: "calc(100vw + 250px)" }}
              transition={{
                duration: cloud.duration,
                repeat: Infinity,
                delay: cloud.delay,
                ease: "linear",
              }}
            >
              <div style={{ transform: `scale(${cloud.scale})` }}>
                {/* Cloud shadow */}
                <div 
                  className="absolute"
                  style={{
                    top: 20,
                    left: 15,
                    width: 100,
                    height: 25,
                    background: "radial-gradient(ellipse, rgba(150, 180, 200, 0.3) 0%, transparent 70%)",
                    filter: "blur(6px)",
                  }}
                />
                {/* Cloud puffs */}
                {Array.from({ length: cloud.layers + 2 }).map((_, j) => {
                  const offsets = [
                    { x: 0, y: 12, w: 45, h: 30 },
                    { x: 20, y: 4, w: 55, h: 38 },
                    { x: 50, y: 0, w: 48, h: 35 },
                    { x: 75, y: 6, w: 40, h: 28 },
                    { x: 35, y: 18, w: 45, h: 26 },
                    { x: 60, y: 15, w: 35, h: 24 },
                  ]
                  const o = offsets[j % offsets.length]
                  return (
                    <div
                      key={j}
                      className="absolute rounded-full"
                      style={{
                        left: o.x,
                        top: o.y,
                        width: o.w,
                        height: o.h,
                        background: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(245,248,252,1) 60%, rgba(220,230,240,0.9) 100%)",
                        boxShadow: "inset 0 -4px 12px rgba(180, 200, 220, 0.3)",
                      }}
                    />
                  )
                })}
              </div>
            </motion.div>
          ))}

          {/* Birds */}
          {[1, 2, 3].map((i) => (
            <motion.svg
              key={`bird-${i}`}
              className="absolute"
              width={12 - i * 2}
              height={6}
              viewBox="0 0 20 10"
              style={{ top: `${15 + i * 8}%`, color: `rgba(80, 90, 100, ${0.5 - i * 0.1})` }}
              initial={{ x: -20 }}
              animate={{ x: ["0vw", "100vw"], y: [0, -10, 3, -6, 0] }}
              transition={{
                x: { duration: 35 + i * 12, repeat: Infinity, delay: i * 8 },
                y: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <path d="M0 5 Q4 1 10 5 Q16 1 20 5" stroke="currentColor" fill="none" strokeWidth="1.2" />
            </motion.svg>
          ))}

          {/* ===== FARM SCENE (DAY) ===== */}
          {/* Far Mountains */}
          <div className="absolute bottom-[18%] left-0 right-0">
            <svg viewBox="0 0 1440 180" className="w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="farMtnDay" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#047857" />
                  <stop offset="100%" stopColor="#065f46" />
                </linearGradient>
              </defs>
              <polygon fill="url(#farMtnDay)" points="0,180 100,100 250,140 400,60 550,120 700,40 850,90 1000,30 1150,70 1300,50 1440,100 1440,180" style={{ filter: 'brightness(0.8)' }} />
            </svg>
          </div>

          {/* Near Mountains */}
          <div className="absolute bottom-[15%] left-0 right-0">
            <svg viewBox="0 0 1440 150" className="w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="nearMtnDay" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" />
                  <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
              </defs>
              <polygon fill="url(#nearMtnDay)" points="0,150 80,80 200,110 350,50 500,90 650,30 800,70 950,40 1100,80 1250,60 1350,100 1440,70 1440,150" />
            </svg>
          </div>

          {/* Ground */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-[15%]"
            style={{ background: 'linear-gradient(to bottom, #22c55e 0%, #16a34a 40%, #15803d 100%)' }}
          />

          {/* Chicken Coop (day) */}
          <div className="absolute bottom-[15%] right-[12%]">
            <div className="w-28 h-16 bg-amber-700 rounded-sm" />
            <div 
              className="absolute -top-7 -left-2 w-0 h-0"
              style={{
                borderLeft: '64px solid transparent',
                borderRight: '64px solid transparent',
                borderBottom: '28px solid #92400e'
              }}
            />
            <div className="absolute top-3 left-3 w-5 h-4 bg-amber-200 rounded-sm" />
            <div className="absolute top-3 right-3 w-5 h-4 bg-amber-200 rounded-sm" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-9 bg-amber-800 rounded-t" />
            {/* Fence */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="absolute bottom-0 w-1.5 h-7 bg-amber-600" style={{ left: `${-18 + i * 10}px` }} />
            ))}
            <div className="absolute bottom-3 -left-5 w-10 h-1 bg-amber-500" />
          </div>

          {/* Shepherd walking */}
          <motion.div
            className="absolute bottom-[16%] left-[18%]"
            animate={{ x: [0, 70, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="relative">
              {/* Shadow */}
              <div className="absolute -bottom-1 left-1 w-5 h-2 bg-black/20 rounded-full blur-sm" />
              {/* Hat */}
              <div className="absolute -top-2 left-0.5 w-4 h-1.5 bg-amber-600 rounded-full" />
              {/* Head */}
              <div className="w-4 h-4 bg-amber-300 rounded-full mx-auto" />
              {/* Body */}
              <div className="w-5 h-8 bg-blue-600 rounded-t-lg mx-auto -mt-0.5" />
              {/* Legs */}
              <div className="flex justify-center gap-0.5">
                <motion.div 
                  className="w-1 h-4 bg-gray-600"
                  animate={{ rotate: [-15, 15, -15] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
                <motion.div 
                  className="w-1 h-4 bg-gray-600"
                  animate={{ rotate: [15, -15, 15] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              </div>
              {/* Staff */}
              <div className="absolute top-2 -right-4 w-0.5 h-10 bg-amber-800 rounded" style={{ transform: 'rotate(-20deg)' }} />
            </div>
          </motion.div>

          {/* Chickens walking */}
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute bottom-[16%]"
              style={{ left: `${24 + i * 4}%` }}
              animate={{ x: [0, 25, 0], y: [0, -2, 0] }}
              transition={{ duration: 5, repeat: Infinity, delay: i * 0.8, ease: "easeInOut" }}
            >
              {/* Shadow */}
              <div className="absolute -bottom-0.5 left-0 w-3 h-1 bg-black/15 rounded-full blur-sm" />
              {/* Body */}
              <div className="w-3 h-2 bg-gradient-to-b from-white to-gray-100 rounded-full shadow-sm" />
              {/* Head */}
              <div className="absolute -top-1 left-0.5 w-1.5 h-1.5 bg-white rounded-full" />
              {/* Comb */}
              <div className="absolute -top-1.5 left-0.5 w-1 h-1 bg-red-500 rounded-t" />
              {/* Beak */}
              <div className="absolute -top-0.5 -left-0.5 w-1 h-0.5 bg-orange-400" />
              {/* Legs */}
              <motion.div 
                className="absolute bottom-0 left-0.5 w-0.5 h-1 bg-orange-400"
                animate={{ rotate: [-10, 10, -10] }}
                transition={{ duration: 0.3, repeat: Infinity }}
              />
              <motion.div 
                className="absolute bottom-0 left-1.5 w-0.5 h-1 bg-orange-400"
                animate={{ rotate: [10, -10, 10] }}
                transition={{ duration: 0.3, repeat: Infinity }}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
