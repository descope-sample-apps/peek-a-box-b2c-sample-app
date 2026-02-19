"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { X, ArrowLeft, LogIn, LogOut, User } from "lucide-react"
import { useDescope, useSession } from "@descope/nextjs-sdk/client"
import { useCart } from "@/components/cart-provider"
import { FloatingNav } from "@/components/ui/floating-navbar"
import { Button } from "@/components/ui/button"

export default function CartPage() {
  const router = useRouter()
  const sdk = useDescope()
  const { items, removeFromCart, totalPrice } = useCart()
  const { isAuthenticated, isSessionLoading } = useSession()

  const handleLogout = async () => {
    await sdk?.logout?.()
    router.push("/")
  }

  const handleCheckout = () => {
    if (!isAuthenticated) {
      router.push("/login?returnTo=/cart")
      return
    }
    if (items.length >= 2) {
      router.push("/cart/step-up")
    } else {
      router.push("/cart/confirm")
    }
  }

  const isEmpty = items.length === 0

  const navItems = [{ name: "Shop", link: "/" }]

  const boxNumber = (name: string, id: string) => {
    const match = name.match(/#(\S+)/)
    return match ? match[1] : id.replace(/^box-/, "")
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav navItems={navItems} />

      {/* Top bar – login/logout then profile if logged in */}
      <div data-slot="top-bar" className="fixed right-6 top-6 z-[5000] flex items-center gap-3 transition-opacity duration-200">
        {!isAuthenticated ? (
          <Link
            href="/login"
            className="flex h-10 items-center gap-2 rounded-full border border-foreground/10 bg-background/80 px-4 py-2 backdrop-blur-md transition-colors hover:bg-muted"
            aria-label="Login"
          >
            <LogIn className="h-4 w-4" />
            <span className="text-base font-medium">Login</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 items-center gap-2 rounded-full border border-foreground/10 bg-background/80 px-4 py-2 backdrop-blur-md transition-colors hover:bg-muted"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-base font-medium">Logout</span>
          </button>
        )}
        {isAuthenticated && (
          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-background/80 backdrop-blur-md transition-colors hover:bg-muted"
            aria-label="Profile"
          >
            <User className="h-4 w-4" />
          </Link>
        )}
      </div>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-28">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>

        <h1 className="mt-8 text-4xl font-semibold tracking-tight sm:text-5xl">
          Your cart
        </h1>

        <AnimatePresence mode="wait">
          {isEmpty ? (
            <motion.div
              key="empty"
              className="mt-20 flex flex-col items-center py-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <img
                  src="/Peek-A-Box_icon-light.svg"
                  alt=""
                  className="h-12 w-12 object-contain dark:hidden"
                  aria-hidden
                />
                <img
                  src="/Peek-A-Box_icon-dark.svg"
                  alt=""
                  className="hidden h-12 w-12 object-contain dark:block"
                  aria-hidden
                />
              </div>
              <p className="mt-6 text-2xl font-semibold text-foreground sm:text-3xl">Your cart is empty.</p>
              <p className="mt-3 text-xl text-muted-foreground sm:text-2xl">
                Add items from the store to get started.
              </p>
              <Button asChild size="lg" className="mt-8 rounded-full border-2 border-foreground/20 px-8 text-base sm:text-lg">
                <Link href="/">Continue shopping</Link>
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="cart"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-12 lg:grid lg:grid-cols-12 lg:gap-16"
            >
              <div className="lg:col-span-7">
                <div className="divide-y divide-border">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      className="flex gap-5 py-6"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                        <div className="relative flex h-[68%] w-[68%] max-h-20 max-w-20 items-center justify-center">
                          <img
                            src="/Peek-A-Box_icon-light.svg"
                            alt=""
                            className="absolute inset-0 h-full w-full object-contain dark:hidden"
                            aria-hidden
                          />
                          <img
                            src="/Peek-A-Box_icon-dark.svg"
                            alt=""
                            className="absolute inset-0 hidden h-full w-full object-contain dark:block"
                            aria-hidden
                          />
                          <span className="absolute bottom-[12%] left-1/2 z-10 -translate-x-1/2 text-sm font-bold tabular-nums text-foreground drop-shadow-sm">
                            #{boxNumber(item.name, item.id)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex justify-between">
                          <div>
                            <h3 className="text-base font-medium sm:text-lg">{item.name}</h3>
                            <p className="mt-1 text-base text-muted-foreground">
                              ${item.price.toFixed(2)} each
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-base font-medium tabular-nums sm:text-lg">
                              ${item.price.toFixed(2)}
                            </p>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              aria-label="Remove item"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="mt-12 lg:col-span-5 lg:mt-0">
                <motion.div
                  className="rounded-2xl bg-muted/50 p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-base font-medium sm:text-lg">Order summary</h2>
                  <dl className="mt-6 space-y-4 text-base">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Items</dt>
                      <dd className="tabular-nums">{items.length}</dd>
                    </div>
                    <div className="flex justify-between border-t border-border pt-4 text-base font-medium">
                      <dt>Total</dt>
                      <dd className="tabular-nums">${totalPrice.toFixed(2)}</dd>
                    </div>
                  </dl>
                  <button
                    onClick={handleCheckout}
                    disabled={isSessionLoading}
                    className="mt-6 w-full rounded-full bg-foreground py-3.5 text-base font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50 sm:text-lg"
                  >
                    {isSessionLoading
                      ? "Loading..."
                      : isAuthenticated
                        ? "Place order"
                        : "Sign in to checkout"}
                  </button>
                  {items.length >= 2 && isAuthenticated && !isSessionLoading && (
                    <p className="mt-4 text-center text-base text-muted-foreground sm:text-lg">
                      Due to the high value of items in your cart, you'll be asked to re-verify your identity before your order is confirmed.
                    </p>
                  )}
                  {!isAuthenticated && !isSessionLoading && (
                    <p className="mt-4 text-center text-base text-muted-foreground sm:text-lg">
                      Sign in to complete your purchase.
                    </p>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
