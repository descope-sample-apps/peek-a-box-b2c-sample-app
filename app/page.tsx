"use client"

import { AppNav } from "@/components/app-nav"
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/product-card"
import { products } from "@/lib/products"
import { GoogleOneTap } from "@/components/google-one-tap"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

export default function StorePage() {
  const bestsellers = products.filter((p) => p.category === "bestsellers")
  const newArrivals = products.filter((p) => p.category === "new")
  const premium = products.filter((p) => p.category === "premium")

  const navItems = [
    { name: "Bestsellers", link: "#bestsellers" },
    { name: "New Arrivals", link: "#newArrivals" },
    { name: "Premium", link: "#premium" },
  ]

  return (
    <main className="min-h-screen bg-background">
      <GoogleOneTap />
      <AppNav navItems={navItems} />

      {/* Hero */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-end overflow-hidden px-6 pt-28 pb-10 sm:min-h-[75vh] sm:pt-32 md:min-h-[68vh] md:pt-36 lg:min-h-[62vh] lg:pt-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-muted via-background to-background" />

        <div className="relative z-10 mx-auto max-w-4xl text-center mb-16">
          <div className="mb-6 inline-flex items-center rounded-full border border-foreground/10 bg-muted/50 px-4 py-1.5 text-base text-muted-foreground sm:text-lg">
            Contents revealed after checkout
          </div>

          <TextGenerateEffect
            words="Shop the collection"
            className="text-5xl font-semibold tracking-tight text-foreground sm:text-7xl"
            duration={0.3}
          />
          <p className="mx-auto mt-8 max-w-xl text-muted-foreground">
            <span className="text-lg sm:text-xl">Choose from our curated selection of mystery boxes.</span>
            <br />
            <span className="text-base sm:text-lg">No refunds. No regrets. Probably.</span>
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="rounded-full border-2 border-foreground/20 px-8 text-base sm:text-lg">
              <Link href="#bestsellers">Shop now</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      <section id="bestsellers" className="bg-muted/30 px-6 pt-12 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <h2 className="text-3xl font-semibold tracking-tight">Bestsellers</h2>
            <p className="mt-2 text-base text-muted-foreground sm:text-lg">
              Our most popular picks. Customer favorites.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {bestsellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section id="newArrivals" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <h2 className="text-3xl font-semibold tracking-tight">New arrivals</h2>
            <p className="mt-2 text-base text-muted-foreground sm:text-lg">
              Fresh picks. Just landed.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Premium */}
      <section id="premium" className="bg-muted/30 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <h2 className="text-3xl font-semibold tracking-tight">Premium</h2>
            <p className="mt-2 text-base text-muted-foreground sm:text-lg">
              Bougie picks for bougie people. Worth the upgrade.
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
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/Peek-A-Box_logo-light.svg"
                alt="Peek A Box"
                className="h-8 dark:hidden"
              />
              <img
                src="/Peek-A-Box_logo-dark.svg"
                alt="Peek A Box"
                className="hidden h-8 dark:block"
              />
            </Link>
            <p className="text-base text-muted-foreground sm:text-lg">
              B2C Sample App •{" "}
              <a
                href="https://github.com/descope-sample-apps/peek-a-box-b2c-sample-app"
                target="_blank"
                rel="noreferrer"
                className="font-medium transition-colors hover:text-foreground"
              >
                Explore the code
                <ExternalLink className="ml-1 inline h-4 w-4" aria-hidden />
              </a>
              {" "}• Powered by Descope.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
