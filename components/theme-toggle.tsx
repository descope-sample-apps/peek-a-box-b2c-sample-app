"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { motion } from "motion/react"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex h-9 w-9 items-center justify-center">
        <div className="h-4 w-4" />
      </div>
    )
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        const newTheme = resolvedTheme === "dark" ? "light" : "dark"
        console.log("Setting theme to:", newTheme)
        setTheme(newTheme)
      }}
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-foreground/10 bg-background/50 text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground"
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
    >
      {resolvedTheme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </motion.button>
  )
}
