"use client"
import { cn } from "@/lib/utils"
import React from "react"
import dynamic from "next/dynamic"

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react"
import Link from "next/link"
import { useState } from "react"

const ThemeToggle = dynamic(() => import("@/components/theme-toggle").then(mod => mod.ThemeToggle), { 
  ssr: false,
  loading: () => <div className="h-9 w-9" />
})

export const FloatingNav = ({
  navItems,
  className,
}: {
  navItems: {
    name: string
    link: string
    icon?: React.ReactNode
  }[]
  className?: string
}) => {
  const { scrollYProgress } = useScroll()
  const [visible, setVisible] = useState(true)

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      const direction = current - scrollYProgress.getPrevious()!

      if (scrollYProgress.get() < 0.05) {
        setVisible(true)
      } else {
        if (direction < 0) {
          setVisible(true)
        } else {
          setVisible(false)
        }
      }
    }
  })

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{
          opacity: 1,
          y: -100,
        }}
        animate={{
          y: visible ? 0 : -100,
          opacity: visible ? 1 : 0,
        }}
        transition={{
          duration: 0.2,
        }}
        className={cn(
          "fixed inset-x-0 top-6 z-[5000] mx-auto flex max-w-fit items-center justify-center gap-2 rounded-full border border-foreground/10 bg-background/80 px-6 py-3 shadow-lg backdrop-blur-md",
          className
        )}
      >
        {navItems.map((navItem, idx) => (
          <Link
            key={`link-${idx}`}
            href={navItem.link}
            className={cn(
              "relative flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            )}
          >
            {navItem.icon && <span className="text-sm">{navItem.icon}</span>}
            <span>{navItem.name}</span>
          </Link>
        ))}
        <div className="ml-2 border-l border-foreground/10 pl-4">
          <ThemeToggle />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
