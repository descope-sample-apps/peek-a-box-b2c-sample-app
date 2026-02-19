"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Menu, ShoppingCart, User, LogOut, LogIn } from "lucide-react"
import { useDescope, useSession } from "@descope/nextjs-sdk/client"
import { useCart } from "@/components/cart-provider"
import { FloatingNav } from "@/components/ui/floating-navbar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

export type NavItem = { name: string; link: string; icon?: React.ReactNode }

export function AppNav({ navItems }: { navItems: NavItem[] }) {
  const router = useRouter()
  const sdk = useDescope()
  const { isAuthenticated } = useSession()
  const { items } = useCart()
  const [open, setOpen] = useState(false)
  const [showLogoInMenu, setShowLogoInMenu] = useState(true)

  useEffect(() => {
    const threshold = typeof window !== "undefined" ? window.innerHeight * 0.6 : 400
    const check = () => setShowLogoInMenu(window.scrollY < threshold)
    check()
    window.addEventListener("scroll", check, { passive: true })
    return () => window.removeEventListener("scroll", check)
  }, [])

  const handleLogout = async () => {
    setOpen(false)
    await sdk?.logout?.()
    router.refresh()
  }

  const closeSheet = () => setOpen(false)

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0)

  return (
    <>
      {/* Mobile: hamburger + sheet */}
      <div data-slot="top-bar" className="fixed left-4 top-6 z-[5000] sm:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            aria-label="Open menu"
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-full border border-foreground/10 bg-background/80 backdrop-blur-md transition-colors hover:bg-muted",
              showLogoInMenu ? "px-2.5" : "w-10",
              open && "invisible pointer-events-none"
            )}
          >
            {showLogoInMenu && (
              <>
                <img
                  src="/Peek-A-Box_logo-light.svg"
                  alt=""
                  className="h-5 w-auto dark:hidden"
                  aria-hidden
                />
                <img
                  src="/Peek-A-Box_logo-dark.svg"
                  alt=""
                  className="hidden h-5 w-auto dark:block"
                  aria-hidden
                />
              </>
            )}
            <Menu className="h-5 w-5 shrink-0" />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-[min(100vw-2rem,320px)] flex-col border-r"
          >
            <SheetHeader className="border-b border-foreground/10 pb-4">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Link
                href="/"
                onClick={closeSheet}
                className="flex items-center rounded-lg transition-opacity hover:opacity-80"
                aria-label="Peek A Box – Home"
              >
                <img
                  src="/Peek-A-Box_logo-light.svg"
                  alt="Peek A Box"
                  className="h-7 w-auto dark:hidden"
                />
                <img
                  src="/Peek-A-Box_logo-dark.svg"
                  alt="Peek A Box"
                  className="hidden h-7 w-auto dark:block"
                />
              </Link>
            </SheetHeader>
            <nav className="flex flex-1 flex-col gap-1 pt-6">
              {navItems.map((item) => (
                <Link
                  key={item.link}
                  href={item.link}
                  onClick={closeSheet}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
              <div className="my-2 border-t border-foreground/10" />
              {!isAuthenticated ? (
                <Link
                  href="/login"
                  onClick={closeSheet}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                >
                  <LogIn className="h-5 w-5" />
                  Login
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-base font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              )}
              <Link
                href="/cart"
                onClick={closeSheet}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
              >
                <ShoppingCart className="h-5 w-5" />
                Cart
                {cartCount > 0 && (
                  <span className="ml-auto rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link
                href="/profile"
                onClick={closeSheet}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
              >
                <User className="h-5 w-5" />
                Profile
              </Link>
            </nav>
            <div className="border-t border-foreground/10 pt-4">
              <div className="flex items-center justify-between px-3">
                <span className="text-sm text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: floating nav + top bar */}
      <div className="hidden sm:block">
        <FloatingNav navItems={navItems} />
      </div>
      <div
        data-slot="top-bar"
        className="hidden sm:flex fixed right-6 top-6 z-[5000] items-center gap-3 transition-opacity duration-200"
      >
        {!isAuthenticated && (
          <Link
            href="/login"
            className="flex h-10 items-center gap-2 rounded-full border border-foreground/10 bg-background/80 px-4 py-2 backdrop-blur-md transition-colors hover:bg-muted"
            aria-label="Login"
          >
            <LogIn className="h-4 w-4" />
            <span className="text-base font-medium">Login</span>
          </Link>
        )}
        {isAuthenticated && (
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
        <Link
          href="/cart"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-background/80 backdrop-blur-md transition-colors hover:bg-muted"
        >
          <ShoppingCart className="h-4 w-4" />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background">
              {cartCount}
            </span>
          )}
        </Link>
        <Link
          href="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-background/80 backdrop-blur-md transition-colors hover:bg-muted"
          aria-label="Profile"
        >
          <User className="h-4 w-4" />
        </Link>
      </div>
    </>
  )
}
