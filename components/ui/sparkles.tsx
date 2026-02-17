"use client"
import { cn } from "@/lib/utils"
import React from "react"

import { useEffect, useId, useState } from "react"

interface SparklesProps {
  id?: string
  className?: string
  background?: string
  minSize?: number
  maxSize?: number
  speed?: number
  particleColor?: string
  particleDensity?: number
  children?: React.ReactNode
}

export const SparklesCore = ({
  id,
  className,
  background = "transparent",
  minSize = 0.4,
  maxSize = 1,
  speed = 1,
  particleColor = "#FFF",
  particleDensity = 100,
}: SparklesProps) => {
  const [particles, setParticles] = useState<
    Array<{
      id: number
      x: number
      y: number
      size: number
      opacity: number
      duration: number
      delay: number
    }>
  >([])
  const generatedId = useId()

  useEffect(() => {
    const newParticles = Array.from({ length: particleDensity }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * (maxSize - minSize) + minSize,
      opacity: Math.random(),
      duration: (Math.random() * 2 + 1) / speed,
      delay: Math.random() * 2,
    }))
    setParticles(newParticles)
  }, [particleDensity, minSize, maxSize, speed])

  return (
    <div
      id={id || generatedId}
      className={cn("relative h-full w-full", className)}
      style={{ background }}
    >
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-pulse rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size * 4}px`,
            height: `${particle.size * 4}px`,
            backgroundColor: particleColor,
            opacity: particle.opacity,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

export const Sparkles = ({ className, children }: SparklesProps) => {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-0">
        <SparklesCore
          background="transparent"
          minSize={0.4}
          maxSize={1}
          particleDensity={50}
          particleColor="#666"
          speed={0.5}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}
