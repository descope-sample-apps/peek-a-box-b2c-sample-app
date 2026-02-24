/**
 * Next.js middleware: runs Descope auth on matched routes.
 */
import { NextRequest, NextResponse } from "next/server"
import { authMiddleware } from "@descope/nextjs-sdk/server"
import {
  getProjectIdFromRequest,
  DESCOPE_PROJECT_COOKIE_NAME,
} from "@/lib/descope-server"

export default async function middleware(
  req: NextRequest
): Promise<NextResponse> {
  const projectId = getProjectIdFromRequest(req)
  const withAuth = authMiddleware({
    projectId,
    redirectUrl: "/login",
    publicRoutes: [
      "/",
      "/login",
      "/cart",
      "/cart/step-up",
      "/cart/confirm",
    ],
  })
  const response = await withAuth(req)
  const projectFromQuery = req.nextUrl.searchParams.get("project")
  if (projectFromQuery) {
    response.cookies.set(DESCOPE_PROJECT_COOKIE_NAME, projectFromQuery, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  return response
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
