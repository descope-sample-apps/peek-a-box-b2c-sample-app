import { createSdk } from "@descope/nextjs-sdk/server"
import type { NextRequest } from "next/server"

export const DESCOPE_PROJECT_COOKIE_NAME = "descope_project_id"

/** Fallback when env/cookie are unset (e.g. CI build). Descope SDK requires a non-empty string. */
const DEFAULT_PROJECT_ID = "P38wcxH1PyMCpu7uOfALgSHn4zKv"

/**
 * Get project ID from request (query param, cookie, or env var).
 */
export function getProjectIdFromRequest(request: NextRequest): string {
  const queryProjectId = request.nextUrl.searchParams.get("project")
  const cookieProjectId = request.cookies.get(DESCOPE_PROJECT_COOKIE_NAME)?.value
  return (
    queryProjectId ||
    cookieProjectId ||
    process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID ||
    DEFAULT_PROJECT_ID
  )
}

/**
 * Get project ID from cookies (or env, or default).
 */
export function getProjectIdFromCookies(
  cookieStore: { get(name: string): { value: string } | undefined }
): string {
  return (
    cookieStore.get(DESCOPE_PROJECT_COOKIE_NAME)?.value ||
    process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID ||
    DEFAULT_PROJECT_ID
  )
}

export function getDescopeServer(projectId?: string) {
  const effectiveProjectId =
    projectId ||
    process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID ||
    DEFAULT_PROJECT_ID
  return createSdk({
    projectId: effectiveProjectId,
    baseUrl: process.env.NEXT_PUBLIC_DESCOPE_BASE_URL,
    managementKey: process.env.DESCOPE_MANAGEMENT_KEY,
  })
}

export const descopeServer = getDescopeServer()
