"use client"
import { cn } from "@/lib/utils"
import React from "react"
import dynamic from "next/dynamic"

import { motion } from "motion/react"
import Link from "next/link"

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
  return (
    <motion.div
      className={cn(
        "fixed inset-x-0 top-6 z-[5000] mx-auto flex max-w-fit items-center justify-center gap-2 rounded-full border border-foreground/10 bg-background/80 px-4 py-3 shadow-lg backdrop-blur-md",
        className
      )}
    >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg transition-opacity hover:opacity-80 pr-4 mr-2 border-r border-foreground/10"
          aria-label="Peek A Box – Home"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-foreground/10 bg-muted/80 text-sm font-semibold text-muted-foreground">
            Logo
          </div>

        </Link>
        {navItems.map((navItem, idx) => (
          <Link
            key={`link-${idx}`}
            href={navItem.link}
            className={cn(
              "relative flex items-center gap-1 px-3 py-2 text-base font-medium text-foreground/70 transition-colors hover:text-foreground"
            )}
          >
            {navItem.icon && <span className="text-base">{navItem.icon}</span>}
            <span>{navItem.name}</span>
          </Link>
        ))}
        <div className="ml-2 border-l border-foreground/10 pl-4">
          <ThemeToggle />
        </div>
    </motion.div>
  )
}
