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

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      localStorage.setItem(STORAGE_KEY, "true")
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl p-8 text-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl sm:text-3xl">
            <Lightbulb className="h-8 w-8 text-foreground" />
            Welcome to [Store Name]
          </DialogTitle>
          <DialogDescription className="text-lg">
            This is a <strong>Descope B2C sample app</strong>. It demonstrates
            how to integrate Descope authentication into a retail-style
            experience—sign in, cart, checkout, and profile.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 p-6">
          <p className="mb-3 text-lg font-medium text-foreground">
            Suggested ways to explore the site:
          </p>
          <ul className="list-inside list-disc space-y-2 text-lg text-muted-foreground">
            {/* Placeholder items—replace with your own exploration steps */}
            <li>[Add your first suggestion here]</li>
            <li>[Add your second suggestion here]</li>
            <li>[Add your third suggestion here]</li>
          </ul>
        </div>

        <p className="text-lg text-muted-foreground">
          Currently using Descope Flows from Project ID:{" "}
          <span className="inline-block rounded-md border border-border bg-muted/30 px-3 py-1.5 font-mono font-medium text-foreground">
            {projectId || "—"}
          </span>
        </p>
      </DialogContent>
    </Dialog>
  )
}
