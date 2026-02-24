"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

/** localStorage key for the selected flow ID (e.g. sign-up-or-in). */
export const FLOW_ID_STORAGE_KEY = "flowId"
/** localStorage key for the selected project ID. */
export const PROJECT_ID_STORAGE_KEY = "projectId"

/** Default flow ID for the login/sign-up page. */
export const DEFAULT_LOGIN_FLOW_ID = "sign-up-or-in"

/** Clear Descope session cookies when project or flow change so the user re-authenticates. */
export function clearDescopeSession(): void {
  if (typeof document === "undefined") return
  document.cookie = "DS=; path=/; max-age=0"
  document.cookie = "DSR=; path=/; max-age=0"
}

/**
 * Resolve project ID from query param, then localStorage, then env.
 * Safe to call on client (env is replaced at build time).
 */
export function getDefaultProjectId(): string {
  return process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID || ""
}

/**
 * Hook that resolves Descope flow ID and project ID from URL search params and localStorage,
 * syncs them to localStorage, and clears the session when either changes.
 * Use this on the login page (and any other page that renders a flow by query/localStorage).
 */
export function useDescopeFlowAndProjectIds(): {
  flowId: string
  projectId: string
} {
  const searchParams = useSearchParams()
  const [flowId, setFlowId] = useState<string>(DEFAULT_LOGIN_FLOW_ID)
  const [projectId, setProjectId] = useState<string>(getDefaultProjectId())

  useEffect(() => {
    if (typeof window === "undefined") return

    const queryProjectId = searchParams.get("project")
    const queryFlowId = searchParams.get("flow")
    const storedProjectId = localStorage.getItem(PROJECT_ID_STORAGE_KEY)
    const storedFlowId = localStorage.getItem(FLOW_ID_STORAGE_KEY)

    const resolvedProjectId =
      queryProjectId || storedProjectId || getDefaultProjectId()
    const resolvedFlowId =
      queryFlowId || storedFlowId || DEFAULT_LOGIN_FLOW_ID

    if (resolvedProjectId && resolvedProjectId !== storedProjectId) {
      clearDescopeSession()
      localStorage.setItem(PROJECT_ID_STORAGE_KEY, resolvedProjectId)
    }
    if (resolvedFlowId !== storedFlowId) {
      clearDescopeSession()
      localStorage.setItem(FLOW_ID_STORAGE_KEY, resolvedFlowId)
    }

    setFlowId(resolvedFlowId)
    setProjectId(resolvedProjectId)
  }, [searchParams])

  return { flowId, projectId }
}
