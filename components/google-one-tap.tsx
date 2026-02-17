"use client"

import { useEffect, useRef, useCallback } from "react"
import { useDescope, useSession } from "@descope/nextjs-sdk/client"

/**
 * Descope Google One Tap: shows Google's one-click sign-in when user is not authenticated.
 * Requires Google OAuth provider with Implicit grant in Descope Console.
 * Renders nothing; only triggers the One Tap prompt.
 */
export function GoogleOneTap() {
  const sdk = useDescope()
  const { isAuthenticated, isSessionLoading } = useSession()
  const oneTapStarted = useRef(false)

  const startOneTap = useCallback(async () => {
    if (oneTapStarted.current) return
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

  // Only show One Tap when we know the user is not logged in
  useEffect(() => {
    if (!isAuthenticated && !isSessionLoading) {
      startOneTap()
    }
  }, [isAuthenticated, isSessionLoading, startOneTap])

  return null
}
