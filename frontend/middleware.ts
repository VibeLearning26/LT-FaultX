import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { allowedPrefix, toDbRole, type DbRole } from "@/lib/roles";

/**
 * Route protection backed by Supabase Auth.
 * - Refreshes the Supabase session cookie on every request.
 * - Guards /user, /operator, /admin by the signed-in user's role.
 * - Unauthenticated users go to /login; wrong-role users to their own home.
 *
 * Role is resolved from profiles.role (source of truth), falling back to the
 * user's metadata role if the profile row isn't readable yet.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { supabase, response, user } = await updateSession(req);

  const needs = (prefix: string) =>
    pathname === prefix || pathname.startsWith(prefix + "/");
  const wantsUser = needs("/user");
  const wantsOperator = needs("/operator");
  const wantsAdmin = needs("/admin");

  if (!wantsUser && !wantsOperator && !wantsAdmin) return response;

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Resolve role: prefer the profiles table, fall back to user metadata.
  let role: DbRole = toDbRole(
    (user.user_metadata as { role?: string } | null)?.role,
  );
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role) role = toDbRole(profile.role);

  const allowed =
    (wantsUser && role === "citizen") ||
    (wantsOperator && role === "operator") ||
    (wantsAdmin && role === "admin");

  if (!allowed) {
    const url = req.nextUrl.clone();
    url.pathname = homeForPrefix(allowedPrefix(role));
    return NextResponse.redirect(url);
  }

  return response;
}

function homeForPrefix(prefix: "/user" | "/operator" | "/admin"): string {
  return prefix === "/admin" ? "/admin/dashboard" : prefix;
}

export const config = {
  matcher: ["/user/:path*", "/operator/:path*", "/admin/:path*"],
};
