"use client";

import type { SimulatorState } from "@/lib/simulator-client";

/**
 * FaultStatusPanel — live status readout. Updates from simulator state
 * (WebSocket + polling), never on page refresh alone.
 */

function Row({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "fault" | "warn" | "muted";
}) {
  const color =
    tone === "ok"
      ? "text-status-normal"
      : tone === "fault"
      ? "text-status-fault"
      : tone === "warn"
      ? "text-status-maint"
      : tone === "muted"
      ? "text-brand-100/40"
      : "text-brand-100/85";
  return (
    <div className="flex items-start justify-between gap-4 border-b border-brand-500/5 py-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-brand-100/40">{label}</span>
      <span className={`text-right font-mono text-xs ${color}`}>{value}</span>
    </div>
  );
}

export default function FaultStatusPanel({ state }: { state: SimulatorState | null }) {
  if (!state) {
    return (
      <div className="card p-5">
        <p className="text-sm text-brand-100/50">Loading simulator state…</p>
      </div>
    );
  }

  const faulted = state.fault_active;

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-100/85">Fault Status</h3>
        <span
          className={`pill ${faulted ? "pill-fault animate-pulse-fault" : "pill-normal"}`}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {faulted ? "FAULT DETECTED" : "NORMAL"}
        </span>
      </div>

      <div className="divide-y divide-brand-500/5">
        <Row
          label="System status"
          value={faulted ? "FAULT DETECTED" : "NORMAL"}
          tone={faulted ? "fault" : "ok"}
        />
        <Row
          label="Electrical line"
          value={state.line_connected ? "CONNECTED" : "BROKEN"}
          tone={state.line_connected ? "ok" : "fault"}
        />
        <Row
          label="Fuse (FD)"
          value={state.fuse_ok ? "OK" : "BLOWN"}
          tone={state.fuse_ok ? "ok" : "fault"}
        />
        <Row label="State machine" value={state.state} tone="muted" />
        <Row
          label="Fault type"
          value={faulted ? state.fault_type ?? "—" : "NONE"}
          tone={faulted ? "fault" : "muted"}
        />
        <Row label="Fault ID" value={state.fault_id ?? "—"} />
        <Row label="Fault status" value={state.fault_status ?? "—"} tone={faulted ? "fault" : "muted"} />
        <Row
          label="Detected at"
          value={state.detected_at ? new Date(state.detected_at).toLocaleTimeString() : "—"}
        />
        <Row label="Node / pole" value={`${state.device_id} · ${state.pole}`} />
        <Row
          label="Location"
          value={`${state.latitude.toFixed(4)}, ${state.longitude.toFixed(4)}`}
        />
        <Row label="Area" value={state.area} />
        <Row label="PIN code" value={state.pincode} />
        <Row
          label="Operator"
          value={
            state.operator_name
              ? `${state.operator_name} (${state.operator_id})`
              : "unassigned"
          }
        />
        <Row
          label="Operator notified"
          value={state.operator_notified ? "YES" : faulted ? "PENDING" : "—"}
          tone={state.operator_notified ? "ok" : faulted ? "warn" : "muted"}
        />
        <Row
          label="Users notified"
          value={String(state.users_notified)}
          tone={state.users_notified > 0 ? "ok" : "muted"}
        />
        <Row
          label="Emergency"
          value={
            state.emergency_status === "NOTIFIED"
              ? `NOTIFIED · ${state.emergency_service ?? ""}`
              : state.emergency_status
          }
          tone={
            state.emergency_status === "NOTIFIED"
              ? "warn"
              : state.emergency_status === "NOT_CONFIGURED"
              ? "muted"
              : "default"
          }
        />
        <Row
          label="Person"
          value={state.person_shocked ? "ELECTROCUTED (SIM)" : "SAFE"}
          tone={state.person_shocked ? "fault" : "ok"}
        />
        <Row
          label="Map marker"
          value={state.map_marker_status}
          tone={state.map_marker_status === "ACTIVE" ? "fault" : "ok"}
        />
      </div>

      {!state.notifications_configured && (
        <p className="mt-3 text-xs text-status-maint/80">
          No operator phone configured — SMS/voice run in dry-run. Set
          <span className="font-mono"> SIMULATOR_OPERATOR_PHONE</span> in
          <span className="font-mono"> backend/.env</span>.
        </p>
      )}
    </div>
  );
}
