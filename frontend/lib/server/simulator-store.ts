/**
 * In-process simulator state for the Next.js fallback bridge.
 *
 * The FastAPI backend stays the source of truth whenever it answers. When it
 * does not (not started, wrong port, an older copy of the app holding :8000),
 * the simulator would otherwise animate locally in the /simulator tab and the
 * dashboards would never learn about the break. This store gives the app a
 * same-origin transport so a line break still propagates to the live maps.
 *
 * State lives in the module scope, so it survives requests but not a dev-server
 * restart — which is exactly the lifetime a demo needs.
 */
import type { SimulatorEventName, SimulatorState } from "@/lib/simulator-client";
import { SIM_SITE } from "@/lib/demo-data";

const DEVICE_ID = "SIM_NODE_01";
const POLE = "POLE-A -> POLE-B (Chelimparambu span)";

function baseState(): SimulatorState {
  return {
    source: "SIMULATOR",
    state: "SYSTEM_NORMAL",
    device_id: DEVICE_ID,
    line_connected: true,
    fuse_ok: true,
    person_shocked: false,
    fault_active: false,
    fault_id: null,
    fault_type: null,
    fault_status: null,
    detected_at: null,
    resolved_at: null,
    latitude: SIM_SITE.lat,
    longitude: SIM_SITE.lng,
    pincode: SIM_SITE.pincode,
    area: `${SIM_SITE.area}, ${SIM_SITE.district}`,
    pole: POLE,
    operator_id: "OP-01",
    operator_name: "Demo Operator",
    operator_notified: false,
    users_notified: 0,
    emergency_status: "IDLE",
    emergency_service: null,
    map_marker_status: "NORMAL",
    notifications_configured: false,
    ports: [],
    active_port: null,
    rerouted: false,
    log: [],
  };
}

let current: SimulatorState = baseState();
let faultSeq = 0;

function log(state: SimulatorState, stage: string, message: string, detail?: string) {
  const entry = { at: new Date().toISOString(), stage, message, detail: detail ?? null };
  return { ...state, log: [...state.log, entry].slice(-40) };
}

export function getSimulatorState(): SimulatorState {
  return current;
}

/** Mirrors the backend phase machine closely enough for the dashboards. */
export function applySimulatorEvent(event: SimulatorEventName, note?: string): SimulatorState {
  const now = new Date().toISOString();
  let next = current;

  switch (event) {
    case "LINE_BREAK":
      faultSeq += 1;
      next = {
        ...next,
        state: "LINE_BROKEN",
        line_connected: false,
        fault_active: true,
        fault_id: `FT-SIM-${String(faultSeq).padStart(4, "0")}`,
        fault_type: "LINE_BREAK",
        fault_status: "ACTIVE",
        detected_at: now,
        resolved_at: null,
        map_marker_status: "FAULT",
        operator_notified: false,
        emergency_status: "PENDING",
      };
      next = log(next, "DETECTION", "Conductor break detected on the monitored span", note);
      next = log(next, "NOTIFICATION", "Affected pincode marked UNAVAILABLE on the map");
      next = log(
        next,
        "NOTIFICATION",
        "Voice call / SMS not dispatched — served by the same-origin bridge",
        "Exotel dispatch lives in the FastAPI backend; start it on :8000 to place real calls",
      );
      break;

    case "FUSE_FAILURE":
      faultSeq += 1;
      next = {
        ...next,
        state: "FAULT_ACTIVE",
        fuse_ok: false,
        fault_active: true,
        fault_id: `FT-SIM-${String(faultSeq).padStart(4, "0")}`,
        fault_type: "FUSE_FAILURE",
        fault_status: "ACTIVE",
        detected_at: now,
        resolved_at: null,
        map_marker_status: "FAULT",
        operator_notified: false,
      };
      next = log(next, "DETECTION", "Fuse element failure detected", note);
      break;

    case "PERSON_CONTACT":
      next = { ...next, state: "PERSON_SHOCKED", person_shocked: true, emergency_status: "ESCALATED" };
      next = log(next, "AUTOMATION", "Downed conductor contacted a pedestrian — emergency escalated", note);
      break;

    case "RESET":
      next = { ...baseState(), log: [] };
      next = log(next, "RECOVERY", "Line restored; span re-energised", note);
      break;
  }

  current = next;
  return current;
}
