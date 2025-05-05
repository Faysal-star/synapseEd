"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart3, BookOpen, CalendarDays, Check } from "lucide-react"

export function CTASection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <section id="contact" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl"
        >
          {/* Background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-indigo-700 z-0">
            {/* Animated particles */}
            <div className="absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-white/10"
                  style={{
                    width: `${Math.random() * 8 + 4}px`,
                    height: `${Math.random() * 8 + 4}px`,
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animation: `float ${Math.random() * 10 + 15}s linear infinite`,
                    opacity: Math.random() * 0.5 + 0.2,
                  }}
                />
              ))}
            </div>
            
            {/* Radial gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/50 via-transparent to-indigo-900/80" />
            
            {/* Pattern overlay */}
            <div className="absolute inset-0 bg-[url('/placeholder.svg?height=600&width=600')] bg-center opacity-5 mix-blend-overlay" />
            
            {/* Diagonal lines */}
            <svg
              className="absolute inset-0 h-full w-full opacity-10"
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              height="100%"
            >
              <defs>
                <pattern
                  id="diagonalLines"
                  patternUnits="userSpaceOnUse"
                  width="40"
                  height="40"
                  patternTransform="rotate(45)"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="40"
                    style={{
                      stroke: "white",
                      strokeWidth: "1",
                    }}
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#diagonalLines)" />
            </svg>
          </div>

          <div className="relative z-10 grid gap-8 px-6 py-12 sm:px-12 md:grid-cols-2 lg:gap-12 lg:px-20 lg:py-24">
            <div className="flex flex-col justify-center space-y-4">
              <div className="inline-flex items-center space-x-2 rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                <span>Limited time offer</span>
                <span className="rounded-full bg-white px-1.5 py-0.5 text-xs font-semibold text-purple-600">20% OFF</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tighter text-white sm:text-4xl md:text-5xl">
                Ready to Transform Your Educational Experience?
              </h2>
              <p className="text-white/90 md:text-xl/relaxed">
                Join thousands of educators and students who are already using SynapseED to enhance learning outcomes
                and create more engaging educational experiences.
              </p>
              
              {/* Feature list */}
              <div className="space-y-3 pt-4">
                {[
                  "AI-powered personalized learning",
                  "Full access to all features",
                  "Regular updates and new features",
                  "Dedicated support team",
                ].map((feature, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.1 * i }}
                    className="flex items-center space-x-2"
                  >
                    <div className="rounded-full bg-white/20 p-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-white/90 text-sm md:text-base">{feature}</span>
                  </motion.div>
                ))}
              </div>
              
              <div className="flex flex-col gap-2 min-[400px]:flex-row pt-4">
                <Button size="lg" className="bg-white text-purple-700 hover:bg-white/90 group h-12 px-6"
                  onClick={() => window.location.href = "/login"}
                  >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 h-12 px-6">
                  Request Demo
                </Button>
              </div>
            </div>
            
            {/* 3D-style visual element */}
            <div className="flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="relative max-w-md"
              >
                {/* Dashboard mockup */}
                <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl p-1 rotate-1">
                  <div className="rounded-xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 overflow-hidden">
                    <div className="bg-indigo-900/80 p-3 flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-white/20"></div>
                        <div className="h-2 w-2 rounded-full bg-white/20"></div>
                        <div className="h-2 w-2 rounded-full bg-white/20"></div>
                      </div>
                      <div className="h-4 w-32 bg-white/10 rounded-md"></div>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <div className="h-6 w-32 bg-white/10 rounded-md"></div>
                        <div className="h-8 w-20 bg-white/20 rounded-md"></div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { icon: <BookOpen className="h-5 w-5 text-purple-300" />, label: "Courses" },
                          { icon: <CalendarDays className="h-5 w-5 text-indigo-300" />, label: "Calendar" },
                          { icon: <BarChart3 className="h-5 w-5 text-blue-300" />, label: "Progress" },
                        ].map((item, i) => (
                          <div key={i} className="flex flex-col items-center justify-center p-3 bg-white/10 rounded-lg">
                            {item.icon}
                            <span className="text-white/80 text-xs mt-1">{item.label}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="h-4 w-full bg-white/10 rounded-md"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <motion.div 
                  className="absolute -top-6 -right-6 h-12 w-12 rounded-full bg-purple-500/80 blur-lg"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 4, repeat: Infinity }}
                ></motion.div>
                <motion.div 
                  className="absolute -bottom-8 -left-4 h-16 w-16 rounded-full bg-indigo-500/80 blur-lg"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                ></motion.div>
              </motion.div>
            </div>
          </div>
          
          {/* Bottom glow */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
        </motion.div>
      </div>
      
      {/* Add CSS for the floating animation */}
      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-10px) translateX(10px); }
          50% { transform: translateY(0) translateX(20px); }
          75% { transform: translateY(10px) translateX(10px); }
          100% { transform: translateY(0) translateX(0); }
        }
      `}</style>
    </section>
  )
}
