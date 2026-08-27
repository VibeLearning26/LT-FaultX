import { cookies } from "next/headers";
import { MODE_COOKIE, defaultMode, normalizeMode, type DataMode } from "@/lib/mode";

/** Server-side: read the active data mode from the request cookie. */
export async function getModeServer(): Promise<DataMode> {
  const store = await cookies();
  const raw = store.get(MODE_COOKIE)?.value;
  return raw ? normalizeMode(raw) : defaultMode();
}
