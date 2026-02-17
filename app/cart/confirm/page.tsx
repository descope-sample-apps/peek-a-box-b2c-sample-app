"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { ArrowLeft, Package, Sparkles } from "lucide-react"
import { useUser } from "@descope/nextjs-sdk/client"
import { useCart } from "@/components/cart-provider"
import { FloatingNav } from "@/components/ui/floating-navbar"
import { Button } from "@/components/ui/button"
import { getRevealForBox } from "@/lib/products"

export default function OrderConfirmPage() {
  const router = useRouter()
  const { items, clearCart } = useCart()
  const { user } = useUser()
  const cleared = useRef(false)
  const [snapshot, setSnapshot] = useState<{ boxId: string; reveal: string }[] | null>(null)

  const userName = user?.name || user?.email?.split("@")[0] || "Guest"

  useEffect(() => {
    if (items.length === 0 && !cleared.current) {
      router.replace("/cart")
      return
    }
    if (items.length > 0 && !cleared.current) {
      cleared.current = true
      setSnapshot(
        items.flatMap((item) =>
          Array(item.quantity)
            .fill(null)
            .map(() => ({
              boxId: item.id,
              reveal: getRevealForBox(item.id),
            }))
        )
      )
      clearCart()
    }
  }, [items, router, clearCart])

  if (items.length === 0 && snapshot === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    )
  }

  if (snapshot === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const reveals = snapshot

  const navItems = [
    { name: "Shop", link: "/" },
    { name: "Cart", link: "/cart" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav navItems={navItems} />

      <main className="mx-auto max-w-2xl px-6 pb-24 pt-28">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight">
          Order confirmation
        </h1>

        <motion.div
          className="mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="mb-8 rounded-2xl bg-muted/50 p-6 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-foreground" />
            <p className="mt-4 text-lg">
              Thank you, <span className="font-semibold">{userName}</span>!
            </p>
            <p className="mt-1 text-muted-foreground">
              Your order has been placed. Here's what you purchased:
            </p>
          </div>

          <div className="space-y-4">
            {reveals.map((item, index) => (
              <motion.div
                key={`${item.boxId}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="rounded-xl border border-foreground/10 bg-card p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {item.boxId.replace("box-", "Item ")}
                    </p>
                    <p className="mt-1 text-lg font-medium">{item.reveal}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/">Continue shopping</Link>
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
