"use client"

import { useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useTheme } from "next-themes"
import { motion } from "motion/react"
import { Descope } from "@descope/nextjs-sdk"
import { useSession } from "@descope/nextjs-sdk/client"
import { ArrowLeft } from "lucide-react"
import { useDescopeFlowAndProjectIds } from "@/lib/descope-client"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { resolvedTheme } = useTheme()
  const { isAuthenticated, isSessionLoading } = useSession()
  const { flowId } = useDescopeFlowAndProjectIds()
  const theme = (resolvedTheme === "dark" ? "dark" : "light") as "light" | "dark"

  const returnTo = searchParams.get("returnTo") || "/"

  // Redirect to the returnTo URL if the user is authenticated
  useEffect(() => {
    if (isAuthenticated && !isSessionLoading) {
      router.push(returnTo)
    }
  }, [isAuthenticated, isSessionLoading, router, returnTo])

  const handleSuccess = useCallback(() => {
    router.push(returnTo)
  }, [router, returnTo])

  if (isSessionLoading || isAuthenticated) {
    return <div className="min-h-screen bg-background" />
  }

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <div className="relative hidden flex-1 flex-col justify-between bg-foreground p-12 text-background lg:flex">
        <Link href="/" className="inline-flex items-center gap-2 text-base text-background/70 transition-colors hover:text-background">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to store
        </Link>

        <div>
          <img
            src="/Peek-A-Box_logo-dark.svg"
            alt="Peek A Box"
            className="h-12 w-auto dark:hidden"
          />
          <img
            src="/Peek-A-Box_logo-light.svg"
            alt="Peek A Box"
            className="hidden h-12 w-auto dark:block"
          />
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
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back to store
          </Link>
        </div>

        <motion.div
          className="flex flex-col items-center justify-center px-6 py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* The Descope flow component used to authenticate the user. */}
          <div className="w-full max-w-sm">
            <Descope
              flowId={flowId}
              onSuccess={handleSuccess}
              theme={theme}
            />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
