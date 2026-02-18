"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Lightbulb } from "lucide-react"

const STORAGE_KEY = "descope-b2c-welcome-dismissed"

export function WelcomePopup({ projectId = "" }: { projectId?: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === "true"
    setOpen(!dismissed)
  }, [])

  useEffect(() => {
    if (open) {
      document.body.classList.add("welcome-open")
    } else {
      document.body.classList.remove("welcome-open")
    }
    return () => document.body.classList.remove("welcome-open")
  }, [open])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      localStorage.setItem(STORAGE_KEY, "true")
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("welcome-dismissed"))
      }
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-5xl p-8 text-xl rounded-3xl border border-foreground/10 bg-background/80 backdrop-blur-md shadow-lg">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-center text-3xl sm:text-4xl">
            Welcome to peek-a-box!
          </DialogTitle>
          <DialogDescription className="text-xl pt-2">
            This is a <strong> sample retail app built by Descope</strong>. It demonstrates
            how to integrate Descope authentication into a retail-style
            experience—sign in, cart, checkout, and profile.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-foreground/10 bg-muted/40 backdrop-blur-sm p-6 shadow-inner">
          <p className="mb-3 text-xl font-medium text-foreground">
            Suggested ways to explore the site:
          </p>
          <ul className="list-inside list-disc space-y-2 text-xl text-muted-foreground">
            {/* Placeholder items—replace with your own exploration steps */}
            <li>[Add your first suggestion here]</li>
            <li>[Add your second suggestion here]</li>
            <li>[Add your third suggestion here]</li>
          </ul>
        </div>

        <p className="text-xl text-muted-foreground">
          Currently using Descope Flows from Project ID:{" "}
          <span className="inline-block rounded-full border border-foreground/10 bg-muted/40 backdrop-blur-sm px-3 py-1.5 font-mono font-medium text-foreground shadow-sm">
            {projectId || "—"}
          </span>
        </p>
      </DialogContent>
    </Dialog>
  )
}
