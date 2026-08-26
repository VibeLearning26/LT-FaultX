import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, decodeSession } from "@/lib/session";

/**
 * Route protection. Guards /user, /operator, /admin by role.
 * Unauthenticated users are redirected to /login; wrong-role users to their own home.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = decodeSession(req.cookies.get(SESSION_COOKIE)?.value);

  const needs = (prefix: string) => pathname === prefix || pathname.startsWith(prefix + "/");

  const wantsUser = needs("/user");
  const wantsOperator = needs("/operator");
  const wantsAdmin = needs("/admin");

  if (!wantsUser && !wantsOperator && !wantsAdmin) return NextResponse.next();

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const roleOk =
    (wantsUser && session.role === "USER") ||
    (wantsOperator && session.role === "OPERATOR") ||
    (wantsAdmin && session.role === "ADMIN");

  if (!roleOk) {
    const url = req.nextUrl.clone();
    url.pathname =
      session.role === "ADMIN"
        ? "/admin/dashboard"
        : session.role === "OPERATOR"
          ? "/operator"
          : "/user";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/user/:path*", "/operator/:path*", "/admin/:path*"],
};
