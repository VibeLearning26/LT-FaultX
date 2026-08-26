import { PageHeader, SimBadge, Card } from "@/components/ui";

function Field({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-brand-100/70">{label}</label>
      <div className="flex items-center gap-2">
        <input
          defaultValue={value}
          className="w-full rounded-lg border border-brand-500/20 bg-ink-950/60 px-3 py-2 font-mono text-brand-50 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        {unit && <span className="text-sm text-brand-100/40">{unit}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-brand-100/40">{hint}</p>}
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Configuration" subtitle="Tunable thresholds and SLA targets." right={<SimBadge />} />

      <Card>
        <p className="mb-4 font-semibold">Fault detection</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Heartbeat timeout" value="30" unit="sec" hint="Missed-heartbeat wait before evaluation." />
          <Field label="Overcurrent threshold" value="8.0" unit="A" hint="Short-circuit confirmation threshold." />
          <Field label="Undervoltage threshold" value="180" unit="V" />
          <Field label="Confirmation samples" value="3" hint="Consecutive abnormal readings required." />
        </div>
      </Card>

      <Card>
        <p className="mb-4 font-semibold">Maintenance SLA</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default timer" value="60" unit="min" hint="Configurable target — not a statutory value." />
          <Field label="Warning threshold" value="15" unit="min" />
        </div>
      </Card>

      <div className="flex gap-2">
        <button className="btn-primary">Save configuration</button>
        <button className="btn-ghost">Reset</button>
      </div>
      <p className="text-xs text-brand-100/40">
        Changes are audited. Persisting settings to the backend is wired in the government phase.
      </p>
    </div>
  );
}
