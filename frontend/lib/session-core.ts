import type { Role } from "./demo-users";

/** Cookie name shared by the local simulation login and logout routes. */
export const SESSION_COOKIE = "ltfx_session";

export interface Session {
  email: string;
  role: Role;
  name: string;
}

export function encodeSession(s: Session): string {
  const value = JSON.stringify(s);
  return typeof btoa === "function" ? btoa(value) : Buffer.from(value, "utf8").toString("base64");
}

export function decodeSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  try {
    const value = typeof atob === "function" ? atob(raw) : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(value);
    if (parsed && parsed.email && parsed.role && parsed.name) return parsed as Session;
    return null;
  } catch {
    return null;
  }
}
