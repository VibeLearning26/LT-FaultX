import { cookies } from "next/headers";
import type { Role } from "./demo-users";

/**
 * Lightweight session helpers. The session is a base64 JSON blob stored in a
 * cookie — sufficient for the demo shell. When the FastAPI backend is added,
 * this becomes a real signed JWT issued by the backend.
 */
export const SESSION_COOKIE = "ltfx_session";

export interface Session {
  email: string;
  role: Role;
  name: string;
}

export function encodeSession(s: Session): string {
  return Buffer.from(JSON.stringify(s), "utf8").toString("base64");
}

export function decodeSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (parsed && parsed.email && parsed.role) return parsed as Session;
    return null;
  } catch {
    return null;
  }
}

/** Server-side: read the current session (for use in server components). */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}
