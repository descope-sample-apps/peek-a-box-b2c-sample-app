"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "motion/react"
import { ArrowLeft } from "lucide-react"
import { Descope } from "@descope/nextjs-sdk"
import { useSession } from "@descope/nextjs-sdk/client"
import { FloatingNav } from "@/components/ui/floating-navbar"

/**
 * Step-up authentication: re-validate the user before proceeding to order confirmation.
 * Requires a step-up flow in Descope Console (e.g. flowId "step-up"). After success, redirect to /cart/confirm.
 */
export default function CartStepUpPage() {
  const router = useRouter()
  const { isAuthenticated, isSessionLoading } = useSession()

  const handleSuccess = useCallback(() => {
    router.push("/cart/confirm")
  }, [router])

  useEffect(() => {
    if (!isSessionLoading && !isAuthenticated) {
      router.replace("/login?returnTo=/cart")
    }
  }, [isAuthenticated, isSessionLoading, router])

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

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-base text-muted-foreground">Redirecting to sign in...</p>
      </div>
    )
  }

  const navItems = [
    { name: "Cart", link: "/cart" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav navItems={navItems} />

      <main className="mx-auto max-w-md px-6 pb-24 pt-28">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cart
        </Link>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight">
          Verify your identity
        </h1>
        <p className="mt-2 text-base text-muted-foreground sm:text-lg">
          For your security, please sign in again before completing your order.
        </p>

        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Create a step-up flow in Descope Console; use its flow ID here */}
          <Descope
            flowId="step-up"
            onSuccess={handleSuccess}
            theme="light"
          />
        </motion.div>
      </main>
    </div>
  )
}
