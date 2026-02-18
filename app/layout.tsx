import React from "react"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { Analytics } from "@vercel/analytics/next"
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
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
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
    <html lang="en" suppressHydrationWarning>
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
