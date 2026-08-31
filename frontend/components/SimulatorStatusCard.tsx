"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useHardware } from "@/lib/hardware-context";
import { fetchSimulatorState, type SimulatorState } from "@/lib/simulator-client";

/**
 * SimulatorStatusCard — read-only report of the fault simulator node's health
 * and feeder ports, for the citizen / operator / admin surfaces.
 *
 * This is a PROTOTYPE-ONLY panel: it renders the software simulator's state
 * (source=SIMULATOR), never real hardware, and exposes no controls. State comes
 * from the same backend endpoint and the same WebSocket hub the /simulator page
 * uses, so there is a single source of truth.
 */

interface Props {
  /** Wording tweak for the audience. */
  audience?: "citizen" | "operator" | "admin";
}

const AUDIENCE_NOTE: Record<NonNullable<Props["audience"]>, string> = {
  citizen:
    "Prototype demo node. If a fault is shown here, supply is being held on the backup port while a crew is dispatched.",
  operator:
    "Prototype demo node (source=SIMULATOR). Not a field asset — no relay or MQTT command is issued from this panel.",
  admin:
    "Prototype demo node (source=SIMULATOR). Shown for pipeline verification; excluded from real asset counts.",
};

export default function SimulatorStatusCard({ audience = "operator" }: Props) {
  const { onEvent } = useHardware();
  const [sim, setSim] = useState<SimulatorState | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchSimulatorState()
      .then((s) => alive && setSim(s))
      .catch(() => alive && setUnavailable(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    return onEvent("simulator", (data: SimulatorState) => {
      setSim(data);
      setUnavailable(false);
    });
  }, [onEvent]);

  if (unavailable && !sim) {
    return (
      <div className="card p-4">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-brand-100/85">Fault Simulator Node</h3>
          <span className="pill pill-unknown">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            PROTOTYPE
          </span>
        </div>
        <p className="text-xs text-brand-100/40">
          Simulator backend unreachable — no prototype status to report.
        </p>
      </div>
    );
  }

  if (!sim) {
    return (
      <div className="card p-4">
        <p className="text-sm text-brand-100/40">Loading simulator node status…</p>
      </div>
    );
  }

  const faulted = sim.fault_active;

  return (
    <div
      className={`card p-4 ${
        faulted ? "border-status-fault/40" : ""
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-brand-100/85">Fault Simulator Node</h3>
          <span className="pill pill-unknown">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            PROTOTYPE
          </span>
        </div>
        <span className={`pill ${faulted ? "pill-fault animate-pulse-fault" : "pill-normal"}`}>
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {faulted ? "FAULT" : "HEALTHY"}
        </span>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs text-brand-100/40">Node</p>
          <p className="font-mono text-xs">
            {sim.device_id} · {sim.pole}
          </p>
        </div>
        <div>
          <p className="text-xs text-brand-100/40">Location</p>
          <p className="font-mono text-xs">
            PIN {sim.pincode} · {sim.area}
          </p>
        </div>
        <div>
          <p className="text-xs text-brand-100/40">Line / fuse</p>
          <p className="font-mono text-xs">
            {sim.line_connected ? "CONNECTED" : "BROKEN"} · fuse{" "}
            {sim.fuse_ok ? "OK" : "BLOWN"}
          </p>
        </div>
        <div>
          <p className="text-xs text-brand-100/40">
            {faulted ? "Detected at" : "Last cleared"}
          </p>
          <p className="font-mono text-xs">
            {faulted
              ? sim.detected_at
                ? new Date(sim.detected_at).toLocaleString()
                : "—"
              : sim.resolved_at
              ? new Date(sim.resolved_at).toLocaleString()
              : "—"}
          </p>
        </div>
      </div>

      {/* feeder ports — the simulator's own ports */}
      <div className="mt-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-brand-100/40">
          Feeder ports {sim.rerouted ? "· signal rerouted" : "· direct"}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {sim.ports.map((p) => {
            const bad = p.status === "FAULT";
            return (
              <div
                key={p.id}
                className={`rounded-lg border px-3 py-2 ${
                  bad
                    ? "border-status-fault/40 bg-status-fault/10"
                    : p.carrying
                    ? "border-status-normal/35 bg-status-normal/10"
                    : "border-brand-500/10 bg-ink-950"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-brand-100/85">{p.id}</span>
                  <span
                    className={`font-mono text-[10px] ${
                      bad
                        ? "text-status-fault"
                        : p.carrying
                        ? "text-status-normal"
                        : "text-brand-100/40"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-brand-100/45">
                  {p.role} · load {p.load_pct}%
                  {p.carrying ? " · carrying" : ""}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {faulted && (
        <p className="mt-3 rounded-lg border border-status-maint/30 bg-status-maint/10 px-3 py-2 text-xs text-status-maint">
          {sim.fault_type ?? "FAULT"} on {sim.device_id}
          {sim.rerouted ? ` — load moved to ${sim.active_port}` : ""}
          {sim.operator_notified ? " · operator notified" : ""}
          {sim.users_notified > 0 ? ` · ${sim.users_notified} user(s) alerted` : ""}
        </p>
      )}

      <p className="mt-3 text-xs text-brand-100/40">{AUDIENCE_NOTE[audience]}</p>

      {audience !== "citizen" && (
        <Link href="/simulator" className="mt-3 inline-block text-xs text-brand-300 hover:underline">
          Open the fault simulator →
        </Link>
      )}
    </div>
  );
}
