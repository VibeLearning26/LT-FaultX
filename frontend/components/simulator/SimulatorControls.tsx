"use client";

import type { SimulatorState } from "@/lib/simulator-client";

/**
 * SimulatorControls — Start / Trigger Fault / Reset, plus the SIMULATION MODE
 * indicator and backend reachability.
 */

interface Props {
  state: SimulatorState | null;
  running: boolean;
  busy: boolean;
  connected: boolean;
  error: string | null;
  telephony: "live" | "dry-run" | "unknown";
  onStart: () => void;
  onTriggerFault: () => void;
  onTriggerFuse: () => void;
  onReset: () => void;
}

export default function SimulatorControls({
  state,
  running,
  busy,
  connected,
  error,
  telephony,
  onStart,
  onTriggerFault,
  onTriggerFuse,
  onReset,
}: Props) {
  const faulted = !!state?.fault_active;

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-brand-100/85">Simulator Controls</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill pill-maint" title="Software-only fault injection">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            SIMULATION MODE
          </span>
          <span
            className={`pill ${connected ? "pill-normal" : "pill-unknown"}`}
            title={connected ? "WebSocket connected" : "WebSocket not connected — polling"}
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            {connected ? "REALTIME" : "POLLING"}
          </span>
          <span
            className={`pill ${telephony === "live" ? "pill-info" : "pill-unknown"}`}
            title="Exotel SMS/voice dispatch mode"
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            SMS: {telephony.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onStart}
          disabled={busy || running}
          className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          {running ? "Simulator running" : "Start Simulator"}
        </button>
        <button
          onClick={onTriggerFault}
          disabled={busy || faulted || !running}
          className="btn-ghost text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Trigger Fault (line break)
        </button>
        <button
          onClick={onTriggerFuse}
          disabled={busy || faulted || !running}
          className="btn-ghost text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Trigger Fuse Failure
        </button>
        <button
          onClick={onReset}
          disabled={busy || !faulted}
          className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset / Restore Line
        </button>
      </div>

      <p className="mt-3 text-xs text-brand-100/45">
        Hovering the mid-span fault zone snaps the conductor; clicking the fuse blows it.
        Both paths raise a real <span className="font-mono">source=SIMULATOR</span> event
        through the FaultX telemetry pipeline. No relay or hardware output is ever driven.
      </p>

      {busy && <p className="mt-2 text-xs text-status-info">Dispatching to backend…</p>}
      {error && (
        <p className="mt-2 rounded border border-status-fault/30 bg-status-fault/10 px-3 py-2 text-xs text-status-fault">
          {error}
        </p>
      )}
    </div>
  );
}
