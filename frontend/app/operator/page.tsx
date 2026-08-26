function Metric({
  label,
  value,
  tone = "default",
  note,
}: {
  label: string;
  value: string;
  tone?: "default" | "fault" | "normal" | "maint";
  note?: string;
}) {
  const toneCls =
    tone === "fault"
      ? "text-status-fault"
      : tone === "normal"
        ? "text-status-normal"
        : tone === "maint"
          ? "text-status-maint"
          : "text-brand-100";
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-brand-100/40">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${toneCls}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-brand-100/40">{note}</p>}
    </div>
  );
}

export default function OperatorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Control Center</h1>
        <p className="text-sm text-brand-100/50">
          Live overview of the LT network. Real-time telemetry wiring arrives in Phase 3.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Healthy Areas" value="12" tone="normal" note="Nominal" />
        <Metric label="Active Faults" value="1" tone="fault" note="Needs attention" />
        <Metric label="Maintenance" value="2" tone="maint" note="In progress" />
        <Metric label="Nodes Online" value="4 / 5" note="1 offline" />
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold">Latest fault</p>
          <span className="pill pill-fault animate-pulse-fault">Active</span>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-brand-100/40">Estimated segment</p>
            <p className="font-mono text-status-fault">NODE_03 → NODE_04</p>
          </div>
          <div>
            <p className="text-xs text-brand-100/40">Last healthy node</p>
            <p className="font-mono text-status-normal">NODE_03</p>
          </div>
          <div>
            <p className="text-xs text-brand-100/40">First failed node</p>
            <p className="font-mono text-status-fault">NODE_04</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-brand-100/40">
          Simulated data. Estimated segment only — not an exact physical distance.
        </p>
      </div>
    </div>
  );
}
