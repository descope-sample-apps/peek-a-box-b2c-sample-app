"use client"

import { useRouter } from "next/navigation"
import { FloatingNav } from "@/components/ui/floating-navbar"
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/product-card"
import { products } from "@/lib/products"
import { useCart } from "@/components/cart-provider"
import { GoogleOneTap } from "@/components/google-one-tap"
import { useDescope, useSession } from "@descope/nextjs-sdk/client"
import { ShoppingCart, User, Package, LogOut } from "lucide-react"
import Link from "next/link"

export default function StorePage() {
  const router = useRouter()
  const { items } = useCart()
  const sdk = useDescope()
  const { isAuthenticated } = useSession()

  // Clear session and refresh the page
  const handleLogout = async () => {
    await sdk?.logout?.()
    router.refresh()
  }
  const chaos = products.filter((p) => p.category === "chaos")
  const cursed = products.filter((p) => p.category === "cursed")
  const premium = products.filter((p) => p.category === "premium")

  const navItems = [
    { name: "Shop", link: "/" },
    { name: "Bestsellers", link: "#chaos" },
    { name: "New", link: "#cursed" },
    { name: "Premium", link: "#premium" },
  ]

  return (
    <main className="min-h-screen bg-background">
      {/* Google One Tap sign-in prompt for unauthenticated users */}
      <GoogleOneTap />
      <FloatingNav navItems={navItems} />

      {/* Top bar */}
      <div className="fixed right-6 top-6 z-[5000] flex items-center gap-3">
        <Link
          href="/cart"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-background/80 backdrop-blur-md transition-colors hover:bg-muted"
        >
          <ShoppingCart className="h-4 w-4" />
          {items.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">
              {items.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
          )}
        </Link>
        <Link
          href={isAuthenticated ? "/profile" : "/login"}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-background/80 backdrop-blur-md transition-colors hover:bg-muted"
          aria-label={isAuthenticated ? "Profile" : "Sign in"}
        >
          <User className="h-4 w-4" />
        </Link>
        {isAuthenticated && (
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 items-center gap-2 rounded-full border border-foreground/10 bg-background/80 px-4 py-2 backdrop-blur-md transition-colors hover:bg-muted"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Log out</span>
          </button>
        )}
      </div>

      {/* Hero */}
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-muted via-background to-background" />
        
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            Contents revealed after purchase
          </div>
          
          <TextGenerateEffect
            words="Shop the collection"
            className="text-5xl font-semibold tracking-tight text-foreground sm:text-7xl"
            duration={0.3}
          />
          
          <p className="mx-auto mt-8 max-w-xl text-lg text-muted-foreground">
            Discover something new. Curated picks and everyday essentials.
            <br />
            <span className="text-sm">No refunds. No regrets. Probably.</span>
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="#chaos">Shop now</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8 bg-transparent">
              <Link href="#premium">View premium</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      <section id="chaos" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <h2 className="text-3xl font-semibold tracking-tight">Bestsellers</h2>
            <p className="mt-2 text-muted-foreground">
              Our most popular picks. Customer favorites.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {chaos.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section id="cursed" className="bg-muted/30 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <h2 className="text-3xl font-semibold tracking-tight">New arrivals</h2>
            <p className="mt-2 text-muted-foreground">
              Fresh picks. Just landed.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cursed.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Premium */}
      <section id="premium" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <h2 className="text-3xl font-semibold tracking-tight">Premium</h2>
            <p className="mt-2 text-muted-foreground">
              Quality you can feel. Worth the upgrade.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {premium.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}  
      <footer className="border-t border-foreground/10 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <p className="text-xl font-semibold tracking-tight">Unboxably</p>
            <p className="text-sm text-muted-foreground">
              B2C Sample App | Powered by Descope.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
