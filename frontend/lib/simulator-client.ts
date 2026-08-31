/**
 * Simulator client — thin wrapper over the backend simulator API.
 *
 * The backend is the single source of truth for simulator state, so a page
 * refresh during an active fault rehydrates the real state instead of
 * optimistically showing NORMAL.
 */

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export type SimulatorStage =
  | "DETECTION"
  | "PROCESSING"
  | "AUTOMATION"
  | "NOTIFICATION"
  | "RECOVERY";

export interface SimulatorLogEntry {
  at: string;
  stage: SimulatorStage | string;
  message: string;
  detail?: string | null;
}

export type SimulatorPhase =
  | "SYSTEM_NORMAL"
  | "FAULT_TRIGGERED"
  | "LINE_BROKEN"
  | "PERSON_SHOCKED"
  | "FAULT_ACTIVE"
  | "LINE_REGENERATED";

export interface SimulatorPort {
  id: string;
  role: "PRIMARY" | "BACKUP" | string;
  status: "HEALTHY" | "FAULT" | "CARRYING" | "STANDBY" | string;
  energised: boolean;
  carrying: boolean;
  load_pct: number;
}

export interface SimulatorState {
  source: "SIMULATOR";
  state: SimulatorPhase | string;
  device_id: string;
  line_connected: boolean;
  fuse_ok: boolean;
  person_shocked: boolean;
  fault_active: boolean;
  fault_id: string | null;
  fault_type: string | null;
  fault_status: string | null;
  detected_at: string | null;
  resolved_at: string | null;
  latitude: number;
  longitude: number;
  pincode: string;
  area: string;
  pole: string;
  operator_id: string | null;
  operator_name: string | null;
  operator_notified: boolean;
  users_notified: number;
  emergency_status: string;
  emergency_service: string | null;
  map_marker_status: string;
  notifications_configured: boolean;
  ports: SimulatorPort[];
  active_port: string | null;
  rerouted: boolean;
  log: SimulatorLogEntry[];
}

export interface SimulatorConfig {
  device_id: string;
  pole: string;
  latitude: number;
  longitude: number;
  pincode: string;
  area: string;
  operator_id: string;
  operator_name: string;
  port_primary: string;
  port_backup: string;
  operator_phone_configured: boolean;
  affected_users_configured: number;
  emergency_service_type: string;
  emergency_service_name: string | null;
  emergency_configured: boolean;
  telephony_mode: "live" | "dry-run";
}

export type SimulatorEventName =
  | "LINE_BREAK"
  | "FUSE_FAILURE"
  | "PERSON_CONTACT"
  | "RESET";

export class SimulatorApiError extends Error {}

/**
 * Which transport last served us: the FastAPI backend, or the same-origin
 * Next.js bridge under /api/sim-bridge. Surfaced in the simulator UI so a demo
 * never silently looks "live" while nothing is actually being shared.
 */
export type SimulatorTransport = "backend" | "bridge" | "none";
let lastTransport: SimulatorTransport = "none";
export const getSimulatorTransport = () => lastTransport;

/**
 * Cross-tab channel. A break triggered in /simulator reaches an already-open
 * /user or /operator tab on the same frame, without waiting for a poll.
 */
const CHANNEL = "ltfx-simulator";

export function broadcastSimulatorState(state: SimulatorState) {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage(state);
    ch.close();
  } catch {
    /* channel unavailable — polling still covers it */
  }
}

export function subscribeSimulatorState(fn: (s: SimulatorState) => void): () => void {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return () => {};
  let ch: BroadcastChannel;
  try {
    ch = new BroadcastChannel(CHANNEL);
  } catch {
    return () => {};
  }
  const handler = (e: MessageEvent) => fn(e.data as SimulatorState);
  ch.addEventListener("message", handler);
  return () => {
    ch.removeEventListener("message", handler);
    ch.close();
  };
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
  } catch {
    throw new SimulatorApiError(`Cannot reach ${url}.`);
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = String(body.detail);
      else if (body?.error) detail = String(body.error);
    } catch {
      /* non-JSON error body */
    }
    throw new SimulatorApiError(detail);
  }
  return (await res.json()) as T;
}

/**
 * Tries the FastAPI backend, then the same-origin bridge.
 *
 * A 404 from :8000 is treated the same as an unreachable backend on purpose —
 * it means whatever is answering there does not implement the simulator API
 * (e.g. an older copy of the app), which is not a usable backend for us.
 */
async function request<T>(
  path: string,
  bridgePath: string,
  init?: RequestInit
): Promise<T> {
  try {
    const out = await call<T>(`${API_URL}${path}`, init);
    lastTransport = "backend";
    return out;
  } catch (backendError) {
    try {
      const out = await call<T>(bridgePath, init);
      lastTransport = "bridge";
      return out;
    } catch {
      lastTransport = "none";
      throw backendError;
    }
  }
}


export function fetchSimulatorState(): Promise<SimulatorState> {
  return request<SimulatorState>("/api/simulator/state", "/api/sim-bridge/state");
}

export function fetchSimulatorConfig(): Promise<SimulatorConfig> {
  // Config is backend-only: the bridge has no telephony to report on.
  return request<SimulatorConfig>("/api/simulator/config", "/api/simulator/config");
}

export async function sendSimulatorEvent(
  event: SimulatorEventName,
  opts: { note?: string; location?: { latitude: number; longitude: number } } = {}
): Promise<{ status: string; simulator: SimulatorState }> {
  const init: RequestInit = {
    method: "POST",
    body: JSON.stringify({
      source: "SIMULATOR",
      event,
      status: event === "RESET" ? "NORMAL" : "FAULT",
      timestamp: new Date().toISOString(),
      ...opts,
    }),
  };
  const res = await request<{ status: string; simulator: SimulatorState }>(
    "/api/simulator/event",
    "/api/sim-bridge/event",
    init
  );
  // Push it to any other open tab immediately, whichever transport answered.
  broadcastSimulatorState(res.simulator);
  return res;
}
