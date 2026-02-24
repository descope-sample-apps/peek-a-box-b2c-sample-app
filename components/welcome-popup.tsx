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
  const [exampleUrl, setExampleUrl] = useState("")

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === "true"
    setOpen(!dismissed)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const base = window.location.origin + window.location.pathname
      setExampleUrl(`${base}?project=YOUR_PROJECT_ID&flow=YOUR_FLOW_ID`)
    }
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
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-center text-3xl sm:text-4xl">
            Welcome to peek-a-box!
          </DialogTitle>
          <DialogDescription className="text-lg">
            This is a <strong> sample retail app built by Descope</strong>. It shows
            how to integrate Descope auth into a B2C-style
            experience.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-foreground/10 bg-muted/40 backdrop-blur-sm p-4 shadow-inner">
          <p className="mb-2 text-lg font-medium text-foreground">
            Suggested ways to explore the site
          </p>
          <ul className="list-inside list-disc space-y-2 text-base text-muted-foreground">
            <li>Try signing up to experience progressive profiling</li>
            <li>Try signing in with Google One Tap</li>
            <li>Try checking out with more than one item in your cart to experience step-up authentication</li>
            <li>Try managing your own profile information with the User Profile widget</li>
          </ul>
        </div>

        <p className="text-base text-muted-foreground">
          Currently using Descope Flows from Project ID:{" "}
          <span className="inline-block rounded-full border border-foreground/10 bg-muted/40 backdrop-blur-sm px-2.5 py-1 font-mono text-sm font-medium text-foreground shadow-sm">
            {projectId || "—"}
          </span>
        </p>

        <div className="rounded-2xl border border-foreground/10 bg-muted/40 backdrop-blur-sm p-4 shadow-inner">
          <p className="mb-2 text-lg font-medium text-foreground">
            Use your own project and flow
          </p>
          <p className="mb-2 text-base text-muted-foreground">
            Use query parameters to point to your own project and flow:
          </p>
          {exampleUrl && (
            <p className="break-all rounded-lg bg-background/80 px-3 py-2 font-mono text-base text-foreground">
              {exampleUrl}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
