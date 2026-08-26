function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-brand-100/40">{label}</p>
      <p className="mt-2 text-3xl font-bold text-brand-100">{value}</p>
      {note && <p className="mt-1 text-xs text-brand-100/40">{note}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Government Overview</h1>
        <p className="text-sm text-brand-100/50">
          Statewide analytics and supervisory metrics. Charts wired in Phase 8.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total Active Faults" value="3" note="Statewide" />
        <Metric label="Avg Restoration" value="47m" note="Rolling 30 days" />
        <Metric label="SLA Compliance" value="92%" note="Target 95%" />
        <Metric label="Node Availability" value="98.4%" note="Fleet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <p className="font-semibold">Outages by district</p>
          <p className="mt-2 text-sm text-brand-100/50">
            Recharts visualization will render here in the analytics phase.
          </p>
        </div>
        <div className="card p-5">
          <p className="font-semibold">Citizen satisfaction</p>
          <p className="mt-2 text-sm text-brand-100/50">
            Monthly feedback trends will render here in the analytics phase.
          </p>
        </div>
      </div>

      <p className="text-xs text-brand-100/40">Demo / simulated data.</p>
    </div>
  );
}
