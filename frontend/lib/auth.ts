import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { toDbRole, type DbRole } from "@/lib/roles";
import { getSession } from "@/lib/session";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: DbRole;
}

/**
 * Server-side: resolve the signed-in user + role from Supabase Auth + profiles.
 * Returns null when not authenticated. Safe to call in Server Components.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Resolve local simulation sessions without contacting Supabase.
  const demoSession = await getSession();
  if (demoSession) {
    return {
      id: `demo:${demoSession.email}`,
      email: demoSession.email,
      name: demoSession.name,
      role: toDbRole(demoSession.role),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let role = toDbRole((user.user_metadata as { role?: string })?.role);
  let name =
    (user.user_metadata as { full_name?: string })?.full_name ??
    user.email ??
    "User";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role) role = toDbRole(profile.role);
  if (profile?.full_name) name = profile.full_name;

  return { id: user.id, email: user.email ?? "", name, role };
});
