/**
 * SIMULATION vs LIVE HARDWARE data mode.
 *
 * - SIMULATION (default): the app reads demo data + existing mock API routes.
 *   Works with no backend / MQTT / ESP32 connectivity.
 * - LIVE: reads real data from Supabase + the FastAPI backend (WebSocket
 *   telemetry). Requires the backend running and Supabase seeded.
 *
 * The active mode is stored in a cookie (`ltfx_mode`) so both server components
 * and the browser agree. A small client control lets admins switch modes.
 */
export type DataMode = "simulation" | "live";

export const MODE_COOKIE = "ltfx_mode";

export function defaultMode(): DataMode {
  const env = process.env.NEXT_PUBLIC_DEFAULT_MODE;
  return env === "live" ? "live" : "simulation";
}

export function normalizeMode(raw: string | undefined | null): DataMode {
  return raw === "live" ? "live" : "simulation";
}

/** Client-side: read the current mode from document.cookie. */
export function getModeClient(): DataMode {
  if (typeof document === "undefined") return defaultMode();
  const m = document.cookie
    .split("; ")
    .find((c) => c.startsWith(MODE_COOKIE + "="));
  if (!m) return defaultMode();
  return normalizeMode(decodeURIComponent(m.split("=")[1]));
}

/** Client-side: set the mode cookie (1 year). */
export function setModeClient(mode: DataMode): void {
  if (typeof document === "undefined") return;
  document.cookie = `${MODE_COOKIE}=${mode}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
