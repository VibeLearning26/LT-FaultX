"use client";

import type { SimulatorState } from "@/lib/simulator-client";

/**
 * FaultLifecycle — fault generation and regeneration visualiser.
 *
 * Shows the pipeline the simulated event travels through, from generation to
 * regeneration, so the automation is observable at a glance. Every stage
 * carries a text state as well as a colour.
 */

type StageState = "PENDING" | "ACTIVE" | "DONE";

interface Stage {
  key: string;
  label: string;
  detail: string;
  state: StageState;
}

function stages(s: SimulatorState | null): Stage[] {
  if (!s) {
    return [
      { key: "gen", label: "Generation", detail: "waiting", state: "PENDING" },
      { key: "det", label: "Detection", detail: "waiting", state: "PENDING" },
      { key: "iso", label: "Isolation / reroute", detail: "waiting", state: "PENDING" },
      { key: "not", label: "Notification", detail: "waiting", state: "PENDING" },
      { key: "reg", label: "Regeneration", detail: "waiting", state: "PENDING" },
    ];
  }

  const faulted = s.fault_active;
  const regenerated = s.state === "LINE_REGENERATED" || (!faulted && !!s.resolved_at);
  const notified = s.operator_notified || s.users_notified > 0;

  const done = (cond: boolean, active: boolean): StageState =>
    cond ? (active ? "ACTIVE" : "DONE") : "PENDING";

  return [
    {
      key: "gen",
      label: "Generation",
      detail: faulted ? (s.fault_type ?? "fault raised") : regenerated ? "cleared" : "line healthy",
      state: done(faulted || regenerated, faulted),
    },
    {
      key: "det",
      label: "Detection",
      detail: s.fault_id ? `#${s.fault_id.slice(0, 8)}` : "no active fault",
      state: done(!!s.fault_id || regenerated, faulted && !!s.fault_id),
    },
    {
      key: "iso",
      label: "Isolation / reroute",
      detail: s.rerouted
        ? `on ${s.active_port ?? "backup"}`
        : faulted
        ? "isolating"
        : `direct on ${s.active_port ?? "primary"}`,
      state: done(s.rerouted || regenerated, s.rerouted),
    },
    {
      key: "not",
      label: "Notification",
      detail: notified
        ? `operator${s.users_notified > 0 ? ` · ${s.users_notified} users` : ""}`
        : faulted
        ? "dispatching"
        : "idle",
      state: done(notified || regenerated, faulted && notified),
    },
    {
      key: "reg",
      label: "Regeneration",
      detail: regenerated
        ? "line restored"
        : faulted
        ? "press RESET"
        : "nothing to restore",
      state: regenerated ? "DONE" : "PENDING",
    },
  ];
}

const TONE: Record<StageState, string> = {
  PENDING: "border-brand-500/10 bg-ink-950 text-brand-100/35",
  ACTIVE: "border-status-fault/50 bg-status-fault/10 text-status-fault",
  DONE: "border-status-normal/40 bg-status-normal/10 text-status-normal",
};

export default function FaultLifecycle({ state }: { state: SimulatorState | null }) {
  const list = stages(state);
  const faulted = !!state?.fault_active;

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-brand-100/85">
          Fault Generation &amp; Regeneration
        </h3>
        <span className={`pill ${faulted ? "pill-fault" : "pill-normal"}`}>
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {state?.state ?? "LOADING"}
        </span>
      </div>

      <ol className="grid gap-2 sm:grid-cols-5">
        {list.map((st, i) => (
          <li
            key={st.key}
            className={`rounded-lg border px-3 py-2 ${TONE[st.state]}`}
            aria-label={`${st.label}: ${st.state}, ${st.detail}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] opacity-60">{i + 1}</span>
              <span className="font-mono text-[9px] tracking-wide">{st.state}</span>
            </div>
            <p className="mt-1 text-xs font-medium leading-tight">{st.label}</p>
            <p className="mt-0.5 truncate font-mono text-[10px] opacity-70" title={st.detail}>
              {st.detail}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
