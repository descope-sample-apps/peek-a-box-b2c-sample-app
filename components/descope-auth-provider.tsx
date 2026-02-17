"use client"

import { AuthProvider } from "@descope/nextjs-sdk"

export function DescopeAuthProvider({
  projectId,
  children,
}: {
  projectId: string
  children: React.ReactNode
}) {
  return <AuthProvider projectId={projectId}>{children}</AuthProvider>
}
