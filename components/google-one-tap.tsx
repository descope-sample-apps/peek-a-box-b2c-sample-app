"use client"

import { useEffect, useRef, useCallback } from "react"
import { useDescope, useSession } from "@descope/nextjs-sdk/client"
import { isUsingDefaultProject } from "@/lib/descope-client"

const WELCOME_DISMISSED_KEY = "descope-b2c-welcome-dismissed"

/**
 * Descope Google One Tap: shows Google's one-click sign-in when user is not authenticated.
 * Only runs after the welcome popup has been dismissed, and only on the app's own project:
 * a project passed in the URL may use Descope's default Google provider, which doesn't support One Tap.
 * Requires Google OAuth provider with Implicit grant in Descope Console.
 * Renders nothing; only triggers the One Tap prompt.
 */
export function GoogleOneTap() {
  const sdk = useDescope()
  const { isAuthenticated, isSessionLoading } = useSession()
  const oneTapStarted = useRef(false)

  const startOneTap = useCallback(async () => {
    if (oneTapStarted.current) return
    if (!isUsingDefaultProject()) return
    if (!sdk?.fedcm?.onetap?.requestAuthentication) return

    oneTapStarted.current = true
    try {
      sdk.fedcm.onetap.requestAuthentication({
        provider: "google",
        oneTapConfig: {
          context: "signin",
          cancel_on_tap_outside: true,
        },
        onSkipped: () => {
          oneTapStarted.current = false
        },
        onDismissed: () => {
          oneTapStarted.current = false
        },
      })
    } catch {
      oneTapStarted.current = false
    }
  }, [sdk])

  // Show One Tap when user is not logged in and welcome popup has been dismissed (on mount or when dismissed)
  useEffect(() => {
    const welcomeDismissed = typeof window !== "undefined" && localStorage.getItem(WELCOME_DISMISSED_KEY) === "true"
    if (!isAuthenticated && !isSessionLoading && welcomeDismissed) {
      startOneTap()
    }
  }, [isAuthenticated, isSessionLoading, startOneTap])

  // When welcome popup is dismissed, show One Tap immediately without refresh
  useEffect(() => {
    const onWelcomeDismissed = () => {
      if (!isAuthenticated && !isSessionLoading) {
        startOneTap()
      }
    }
    window.addEventListener("welcome-dismissed", onWelcomeDismissed)
    return () => window.removeEventListener("welcome-dismissed", onWelcomeDismissed)
  }, [isAuthenticated, isSessionLoading, startOneTap])

  return null
}
