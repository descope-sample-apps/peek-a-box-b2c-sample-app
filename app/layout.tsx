import React from "react"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { Analytics } from "@vercel/analytics/next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { CartProvider } from "@/components/cart-provider"
import { DescopeAuthProvider } from "@/components/descope-auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { WelcomePopup } from "@/components/welcome-popup"
import { DESCOPE_PROJECT_COOKIE_NAME } from "@/lib/descope-server"
import "./globals.css"


export const metadata: Metadata = {
  title: 'Peek A Box | Shop',
  description: 'Shop our collection. Sign in for a seamless checkout experience.',
  icons: {
    icon: [
      {
        url: '/Peek-A-Box_icon-light.svg',
        media: '(prefers-color-scheme: light)',
        type: 'image/svg+xml',
      },
      {
        url: '/Peek-A-Box_icon-dark.svg',
        media: '(prefers-color-scheme: dark)',
        type: 'image/svg+xml',
      },
      {
        url: '/Peek-A-Box_icon-light.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/Peek-A-Box_icon-light.svg',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const projectId =
    cookieStore.get(DESCOPE_PROJECT_COOKIE_NAME)?.value ||
    process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID ||
    ""

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DescopeAuthProvider projectId={projectId}>
            <CartProvider>
              <WelcomePopup projectId={projectId} />
              {children}
            </CartProvider>
          </DescopeAuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
