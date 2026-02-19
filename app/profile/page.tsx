"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "motion/react"
import { UserProfile } from "@descope/nextjs-sdk"
import { useDescope } from "@descope/nextjs-sdk/client"
import { ArrowLeft } from "lucide-react"
import { AppNav } from "@/components/app-nav"

// Protected by authMiddleware (proxy); unauthenticated users are redirected to /login
export default function ProfilePage() {
  const router = useRouter()
  const sdk = useDescope()

  const handleLogout = async () => {
    await sdk?.logout?.()
    router.push("/")
  }

  const navItems = [{ name: "Shop", link: "/" }]

  return (
    <div className="min-h-screen bg-background">
      <AppNav navItems={navItems} />

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
