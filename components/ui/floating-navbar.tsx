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
      data-slot="floating-nav"
      className={cn(
        "fixed inset-x-0 top-6 z-[5000] mx-auto flex w-max max-w-[calc(100vw-2rem)] items-center justify-center gap-0 overflow-x-auto rounded-full border border-foreground/10 bg-background/80 px-2 py-2 shadow-lg backdrop-blur-md transition-opacity duration-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-w-fit sm:gap-2 sm:overflow-visible sm:px-4 sm:py-3",
        className
      )}
    >
        <Link
          href="/"
          className="flex shrink-0 items-center rounded-lg transition-opacity hover:opacity-80"
          aria-label="Peek A Box – Home"
        >
          <img
            src="/Peek-A-Box_logo-light.svg"
            alt="Peek A Box"
            className="h-6 w-auto dark:hidden sm:h-8"
          />
          <img
            src="/Peek-A-Box_logo-dark.svg"
            alt="Peek A Box"
            className="hidden h-6 w-auto dark:block sm:h-8"
          />
        </Link>
        <div className="ml-1 flex min-w-0 shrink items-center border-l border-foreground/10 pl-2 sm:ml-2 sm:pl-4">
          {navItems.map((navItem, idx) => (
            <Link
              key={`link-${idx}`}
              href={navItem.link}
              className={cn(
                "relative flex shrink-0 items-center gap-1 rounded-md px-2 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground active:bg-foreground/5 sm:px-3 sm:text-base"
              )}
            >
              {navItem.icon && <span className="text-base">{navItem.icon}</span>}
              <span className="whitespace-nowrap">{navItem.name}</span>
            </Link>
          ))}
        </div>
        <div className="ml-1 shrink-0 border-l border-foreground/10 pl-2 sm:ml-2 sm:pl-4">
          <ThemeToggle />
        </div>
    </motion.div>
  )
}
