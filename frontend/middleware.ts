import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { homeForRole, toDbRole, type DbRole } from "@/lib/roles";
import { SESSION_COOKIE, decodeSession } from "@/lib/session-core";

/**
 * Route protection backed by Supabase Auth, with a dev demo-session fallback.
 * - Refreshes the Supabase session cookie on every request.
 * - Guards /user, /operator, /admin by the signed-in user's role.
 * - Unauthenticated users go to /login; wrong-role users to their own home.
 *
 * Demo mode: when no Supabase auth cookies are present but the demo session
 * cookie is, the session role is used (set by POST /api/auth/login). This
 * keeps the demo fully functional when Supabase demo users are missing.
 *
 * Perf: Supabase getUser() (a network call) runs ONLY when auth cookies
 * exist. Public routes skip it entirely.
 */
async function resolveUser(req: NextRequest): Promise<{
  user: User | null;
  role: DbRole | null;
  response: NextResponse | null;
}> {
  // A deliberately local, development-only session wins when present. This
  // also handles switching from a Supabase demo user to the local operator.
  const demoSession = decodeSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (demoSession) {
    return { user: null, role: toDbRole(demoSession.role), response: null };
  }

  // Fast path: no Supabase auth cookies -> skip the network roundtrip and
  // resolve from the demo session cookie if present.
  const hasAuthCookies = req.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasAuthCookies) {
    return { user: null, role: null, response: null };
  }

  let response = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: DbRole | null = null;
  if (user) {
    role = toDbRole((user.user_metadata as { role?: string } | null)?.role);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role) role = toDbRole(profile.role);
  }

  return { user, role, response };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { role, response } = await resolveUser(req);

  const needs = (prefix: string) =>
    pathname === prefix || pathname.startsWith(prefix + "/");
  const wantsUser = needs("/user");
  const wantsOperator = needs("/operator");
  const wantsAdmin = needs("/admin");

  if (!wantsUser && !wantsOperator && !wantsAdmin) {
    return response ?? NextResponse.next();
  }

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const allowed =
    (wantsUser && role === "citizen") ||
    (wantsOperator && role === "operator") ||
    (wantsAdmin && role === "admin");

  if (!allowed) {
    const url = req.nextUrl.clone();
    url.pathname = homeForRole(role);
    return NextResponse.redirect(url);
  }

  return response ?? NextResponse.next();
}

export const config = {
  matcher: ["/user/:path*", "/operator/:path*", "/admin/:path*"],
};
