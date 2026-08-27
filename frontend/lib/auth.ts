import { createClient } from "@/lib/supabase/server";
import { toDbRole, type DbRole } from "@/lib/roles";

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
export async function getCurrentUser(): Promise<CurrentUser | null> {
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
}
