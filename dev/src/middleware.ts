import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

/**
 * Paths that do not require authentication.
 * Exact method + path combinations are checked below.
 */
const PUBLIC_PATHS: { method?: string; path: string }[] = [
  { method: "POST", path: "/api/v1/auth/register" },
  { method: "POST", path: "/api/v1/auth/login" },
  { method: "GET", path: "/api/v1/posts" },
  { method: "GET", path: "/api/v1/users" },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for public paths (match method + path prefix)
  const isPublic = PUBLIC_PATHS.some((route) => {
    const pathMatch = pathname.startsWith(route.path);
    if (!pathMatch) return false;
    if (route.method) return request.method === route.method;
    return true;
  });
  if (isPublic) {
    return NextResponse.next();
  }

  // Only protect API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for JWT token in cookie
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json(
      {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
      { status: 401 }
    );
  }

  try {
    const payload = await verifyToken(token);

    // Attach user info to request headers for downstream handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.sub);
    requestHeaders.set("x-user-email", payload.email);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    return NextResponse.json(
      {
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
