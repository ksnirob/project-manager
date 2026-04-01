import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "pm_admin_session";
const protectedPrefixes = ["/clients", "/projects", "/tasks", "/invoices"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);

  const isProtectedPath = pathname === "/" || protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!hasSessionCookie && isProtectedPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSessionCookie && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/clients/:path*", "/projects/:path*", "/tasks/:path*", "/invoices/:path*"],
};
