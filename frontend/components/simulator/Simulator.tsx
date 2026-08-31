"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHardware } from "@/lib/hardware-context";
import {
  broadcastSimulatorState,
  fetchSimulatorConfig,
  fetchSimulatorState,
  sendSimulatorEvent,
  type SimulatorConfig,
  type SimulatorEventName,
  type SimulatorState,
} from "@/lib/simulator-client";
import SimulatorScene from "./SimulatorScene";
import SimulatorControls from "./SimulatorControls";

/** Delay between the conductor snapping and it reaching the pedestrian. */
const CONTACT_DELAY_MS = 1300;

/**
 * Local fallback state.
 *
 * The backend stays the source of truth whenever it answers, but the animation
 * must never be hostage to it — if the API is unreachable the scene still
 * snaps, shocks and resets so the simulator remains demonstrable offline.
 */
function localBaseState(config: SimulatorConfig | null): SimulatorState {
  return {
    source: "SIMULATOR",
    state: "SYSTEM_NORMAL",
    device_id: config?.device_id ?? "SIM_NODE_01",
    line_connected: true,
    fuse_ok: true,
    person_shocked: false,
    fault_active: false,
    fault_id: null,
    fault_type: null,
    fault_status: null,
    detected_at: null,
    resolved_at: null,
    latitude: config?.latitude ?? 12.0006,
    longitude: config?.longitude ?? 75.5262,
    pincode: config?.pincode ?? "670632",
    area: config?.area ?? "Chelimparambu, Chemberi, Kannur",
    pole: config?.pole ?? "POLE-A",
    operator_id: config?.operator_id ?? null,
    operator_name: config?.operator_name ?? null,
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

/** Applies an event to local state, mirroring the backend's phase machine. */
function localReduce(prev: SimulatorState, event: SimulatorEventName): SimulatorState {
  const now = new Date().toISOString();
  switch (event) {
    case "LINE_BREAK":
      return { ...prev, state: "LINE_BROKEN", line_connected: false, fault_active: true,
        fault_type: "LINE_BREAK", fault_status: "ACTIVE", detected_at: now,
        map_marker_status: "FAULT" };
    case "FUSE_FAILURE":
      return { ...prev, state: "FAULT_ACTIVE", fuse_ok: false, fault_active: true,
        fault_type: "FUSE_FAILURE", fault_status: "ACTIVE", detected_at: now,
        map_marker_status: "FAULT" };
    case "PERSON_CONTACT":
      return { ...prev, state: "PERSON_SHOCKED", person_shocked: true };
    case "RESET":
      return localBaseState(null);
    default:
      return prev;
  }
}

export default function Simulator() {
  const { connected, onEvent } = useHardware();

  const [sim, setSim] = useState<SimulatorState | null>(null);
  const [config, setConfig] = useState<SimulatorConfig | null>(null);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef(false);
  const contactTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------- dispatch
  // The local transition is applied first so the scene reacts on the same
  // frame as the interaction. The backend call then either confirms it (its
  // payload replaces ours) or fails, leaving the local animation intact.
  const dispatch = useCallback(
    async (event: SimulatorEventName, note?: string) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      setError(null);

      let optimistic: SimulatorState | null = null;
      setSim((prev) => {
        optimistic = localReduce(prev ?? localBaseState(config), event);
        return optimistic;
      });

      try {
        const res = await sendSimulatorEvent(event, note ? { note } : {});
        setSim(res.simulator);
      } catch (e) {
        // Neither the backend nor the bridge accepted it: keep the animation
        // going and still push our own state to any open dashboard tab.
        if (optimistic) broadcastSimulatorState(optimistic);
        setError(
          e instanceof Error
            ? `${e.message} — the animation is running locally only.`
            : "Simulator event failed",
        );
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [config],
  );

  // ------------------------------------------------------- initial hydration
  // State and config are fetched independently: state has a same-origin
  // fallback, config is backend-only, so a missing backend must not stop the
  // simulator from rehydrating an active fault.
  useEffect(() => {
    let alive = true;
    fetchSimulatorState()
      .then((state) => {
        if (!alive) return;
        setSim(state);
        if (state.fault_active) setRunning(true);
      })
      .catch((e) => {
        if (!alive) return;
        setSim(localBaseState(null));
        setError(
          e instanceof Error
            ? `${e.message} — running the animation locally only.`
            : "Cannot load simulator state",
        );
      });
    fetchSimulatorConfig()
      .then((cfg) => alive && setConfig(cfg))
      .catch(() => {
        /* telephony config is backend-only and optional for the animation */
      });
    return () => {
      alive = false;
    };
  }, []);

  // --------------------------------------------- realtime (existing WS hub)
  useEffect(() => {
    return onEvent("simulator", (data: SimulatorState) => setSim(data));
  }, [onEvent]);

  // ---- polling fallback, only while the socket is down (no new architecture)
  useEffect(() => {
    if (connected) return;
    const id = setInterval(() => {
      fetchSimulatorState()
        .then(setSim)
        .catch(() => {
          /* handled by the error banner on the next user action */
        });
    }, 5000);
    return () => clearInterval(id);
  }, [connected]);

  // --------------------- conductor lands on the pedestrian after it snaps
  useEffect(() => {
    if (!sim) return;
    const shouldContact = sim.fault_active && !sim.line_connected && !sim.person_shocked;
    if (!shouldContact) {
      if (contactTimer.current) {
        clearTimeout(contactTimer.current);
        contactTimer.current = null;
      }
      return;
    }
    contactTimer.current = setTimeout(() => {
      dispatch("PERSON_CONTACT", "downed conductor contacted pedestrian");
    }, CONTACT_DELAY_MS);
    return () => {
      if (contactTimer.current) clearTimeout(contactTimer.current);
      contactTimer.current = null;
    };
  }, [sim, dispatch]);

  // ---------------------------------------------------------------- handlers
  const faulted = !!sim?.fault_active;

  const onStart = () => {
    setRunning(true);
    setError(null);
  };

  const onSnap = useCallback(() => {
    if (!running || faulted || busy) return;
    dispatch("LINE_BREAK", "mid-span fault zone interaction");
  }, [running, faulted, busy, dispatch]);

  const onFuseClick = useCallback(() => {
    if (!running || faulted || busy) return;
    dispatch("FUSE_FAILURE", "fuse unit FD clicked");
  }, [running, faulted, busy, dispatch]);

  const onReset = useCallback(() => {
    if (busy) return;
    dispatch("RESET", "RESET pressed");
  }, [busy, dispatch]);

  const walking =
    running && !!sim && !(sim.fault_active && !sim.line_connected) && !sim.person_shocked;

  return (
    <div className="space-y-6">
      <SimulatorControls
        state={sim}
        running={running}
        busy={busy}
        connected={connected}
        error={error}
        telephony={config?.telephony_mode ?? "unknown"}
        onStart={onStart}
        onTriggerFault={onSnap}
        onTriggerFuse={onFuseClick}
        onReset={onReset}
      />

      {!running && (
        <p className="rounded-lg border border-status-info/30 bg-status-info/10 px-4 py-3 text-sm text-status-info">
          Press <strong>Start Simulator</strong> to begin monitoring — the pedestrian starts
          walking and the fault zone becomes interactive.
        </p>
      )}

      <SimulatorScene
        lineConnected={sim?.line_connected ?? true}
        fuseOk={sim?.fuse_ok ?? true}
        personShocked={sim?.person_shocked ?? false}
        faultActive={faulted}
        contacting={sim?.person_shocked ?? false}
        walking={walking}
        busy={!running}
        deviceId={sim?.device_id ?? config?.device_id ?? "SIM_NODE_01"}
        pincode={sim?.pincode ?? config?.pincode ?? "—"}
        area={sim?.area ?? config?.area ?? "—"}
        onSnap={onSnap}
        onFuseClick={onFuseClick}
        onReset={onReset}
      />
    </div>
  );
}
