"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "motion/react"
import { UserProfile } from "@descope/nextjs-sdk"
import { useDescope } from "@descope/nextjs-sdk/client"
import { useCart } from "@/components/cart-provider"
import { ArrowLeft, ShoppingCart, LogOut } from "lucide-react"
import { FloatingNav } from "@/components/ui/floating-navbar"

// Protected by authMiddleware (proxy); unauthenticated users are redirected to /login
export default function ProfilePage() {
  const router = useRouter()
  const sdk = useDescope()
  const { items } = useCart()

  const handleLogout = async () => {
    await sdk?.logout?.()
    router.push("/")
  }

  const navItems = [{ name: "Shop", link: "/" }]

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav navItems={navItems} />

      {/* Top bar – logout then cart (left to right) */}
      <div data-slot="top-bar" className="fixed right-6 top-6 z-[5000] flex items-center gap-3 transition-opacity duration-200">
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-10 items-center gap-2 rounded-full border border-foreground/10 bg-background/80 px-4 py-2 backdrop-blur-md transition-colors hover:bg-muted"
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-base font-medium">Logout</span>
        </button>
        <Link
          href="/cart"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-background/80 backdrop-blur-md transition-colors hover:bg-muted"
          aria-label="Cart"
        >
          <ShoppingCart className="h-4 w-4" />
          {items.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background">
              {items.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
          )}
        </Link>
      </div>

      <main className="mx-auto max-w-2xl px-6 pb-24 pt-28">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight">
          Your Profile
        </h1>

        <motion.div
          className="mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* The User Profile widget enables users to manage their personal information, profile pictures, and authentication methods*/}
          <UserProfile
            widgetId="user-profile-widget"
            onLogout={handleLogout}
          />
        </motion.div>
      </main>
    </div>
  )
}
