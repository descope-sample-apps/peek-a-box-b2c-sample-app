"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { motion } from "motion/react"
import { useSession } from "@descope/nextjs-sdk/client"
import { ArrowLeft } from "lucide-react"

const Descope = dynamic(
  () => import("@descope/nextjs-sdk").then((mod) => mod.Descope),
  { ssr: false }
)

const FLOW_ID_STORAGE_KEY = "flowId"
const PROJECT_ID_STORAGE_KEY = "projectId"
const DEFAULT_FLOW_ID = "sign-up-or-in"

// Descope session cookie names; clear when project or flow changes
function clearDescopeSession() {
  if (typeof document === "undefined") return
  document.cookie = "DS=; path=/; max-age=0"
  document.cookie = "DSR=; path=/; max-age=0"
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isSessionLoading } = useSession()
  const [flowId, setFlowId] = useState<string>(DEFAULT_FLOW_ID)

  const returnTo = searchParams.get("returnTo") || "/"

  // Flow ID and project ID from query param or localStorage (like React sample). Clear session when they change.
  useEffect(() => {
    if (typeof window === "undefined") return

    const queryProjectId = searchParams.get("project")
    const queryFlowId = searchParams.get("flow")
    const storedProjectId = localStorage.getItem(PROJECT_ID_STORAGE_KEY)
    const storedFlowId = localStorage.getItem(FLOW_ID_STORAGE_KEY)

    const projectId = queryProjectId || storedProjectId || ""
    const flowIdResolved = queryFlowId || storedFlowId || DEFAULT_FLOW_ID

    if (projectId && projectId !== storedProjectId) {
      clearDescopeSession()
      localStorage.setItem(PROJECT_ID_STORAGE_KEY, projectId)
    }
    if (flowIdResolved !== storedFlowId) {
      clearDescopeSession()
      localStorage.setItem(FLOW_ID_STORAGE_KEY, flowIdResolved)
    }

    setFlowId(flowIdResolved)
  }, [searchParams])

  useEffect(() => {
    if (isAuthenticated && !isSessionLoading) {
      router.push(returnTo)
    }
  }, [isAuthenticated, isSessionLoading, router, returnTo])

  const handleSuccess = useCallback(() => {
    router.push(returnTo)
  }, [router, returnTo])

  if (isSessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <motion.div
          className="h-6 w-6 rounded-full border-2 border-foreground border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-base text-muted-foreground">Redirecting...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <div className="relative hidden flex-1 flex-col justify-between bg-foreground p-12 text-background lg:flex">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-base text-background/70 transition-colors hover:text-background"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Logo placeholder</h1>
          <p className="mt-4 max-w-md text-lg text-background/70">
            Sign in or create an account to checkout and manage your orders.
          </p>
        </div>

        <p className="text-base text-background/50">
          Secure authentication powered by Descope
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center min-h-screen lg:min-h-0">
        <div className="absolute left-6 top-6 p-6 lg:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to store
          </Link>
        </div>

        <motion.div
          className="flex flex-col items-center justify-center px-6 py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-full max-w-sm">
            <Descope
              flowId={flowId}
              onSuccess={handleSuccess}
              theme="light"
            />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
