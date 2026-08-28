import { cookies } from "next/headers";
import { decodeSession, SESSION_COOKIE } from "./session-core";

export { decodeSession, encodeSession, SESSION_COOKIE } from "./session-core";
export type { Session } from "./session-core";
import type { Session } from "./session-core";

/** Server-side: read the current session (for use in server components). */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}
