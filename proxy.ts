import { NextRequest, NextResponse } from "next/server"
import { authMiddleware } from "@descope/nextjs-sdk/server"

const PROJECT_COOKIE_NAME = "descope_project_id"

// Resolve project ID the same way as layout: query > cookie > env (must match client)
function getProjectId(req: NextRequest): string {
  const url = req.nextUrl
  const queryProjectId = url.searchParams.get("project")
  const cookieProjectId = req.cookies.get(PROJECT_COOKIE_NAME)?.value
  return (
    queryProjectId ||
    cookieProjectId ||
    process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID ||
    ""
  )
}

export default async function middleware(
  req: NextRequest
): Promise<NextResponse> {
  const projectId = getProjectId(req)
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
    response.cookies.set(PROJECT_COOKIE_NAME, projectFromQuery, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  return response
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
