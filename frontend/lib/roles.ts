/**
 * Role model shared across the app.
 *
 * The Supabase `profiles.role` enum uses lowercase `citizen | operator | admin`.
 * The original frontend shell used uppercase `USER | OPERATOR | ADMIN`. This
 * module standardises on the Supabase values and provides a compatibility map
 * so existing UI code keeps working during the migration.
 */
export type DbRole = "citizen" | "operator" | "admin";
export type LegacyRole = "USER" | "OPERATOR" | "ADMIN";

export const DB_TO_LEGACY: Record<DbRole, LegacyRole> = {
  citizen: "USER",
  operator: "OPERATOR",
  admin: "ADMIN",
};

export const LEGACY_TO_DB: Record<LegacyRole, DbRole> = {
  USER: "citizen",
  OPERATOR: "operator",
  ADMIN: "admin",
};

export function toDbRole(role: string | null | undefined): DbRole {
  if (!role) return "citizen";
  const r = role.toLowerCase();
  if (r === "operator") return "operator";
  if (r === "admin") return "admin";
  if (r === "citizen") return "citizen";
  // legacy uppercase
  const up = role.toUpperCase() as LegacyRole;
  return LEGACY_TO_DB[up] ?? "citizen";
}

/** Landing route after login for a given role. */
export function homeForRole(role: DbRole): string {
  switch (role) {
    case "operator":
      return "/operator";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/user";
  }
}

/** URL-path prefix a role is allowed to access. */
export function allowedPrefix(role: DbRole): "/user" | "/operator" | "/admin" {
  switch (role) {
    case "operator":
      return "/operator";
    case "admin":
      return "/admin";
    default:
      return "/user";
  }
}
