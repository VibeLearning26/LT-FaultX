import { PageHeader, SimBadge, Card } from "@/components/ui";

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-brand-100/40">{label}</p>
      <p className="mt-2 text-3xl font-bold text-brand-100">{value}</p>
      {note && <p className="mt-1 text-xs text-brand-100/40">{note}</p>}
    </Card>
  );
}

const DISTRICTS = [
  { name: "Ernakulam", outages: 3, sla: "91%" },
  { name: "Thrissur", outages: 1, sla: "96%" },
  { name: "Kozhikode", outages: 2, sla: "88%" },
  { name: "Thiruvananthapuram", outages: 0, sla: "99%" },
];

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Fault Analytics"
        subtitle="Statewide fault, outage and SLA metrics."
        right={<SimBadge />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total Active Faults" value="6" note="Statewide" />
        <Metric label="Total Outages (30d)" value="128" />
        <Metric label="Avg Restoration" value="47m" note="Rolling 30 days" />
        <Metric label="SLA Compliance" value="92%" note="Target 95%" />
        <Metric label="Citizen Satisfaction" value="4.1 / 5" />
        <Metric label="Repeated Faults" value="9" note="Same segment ×2+" />
        <Metric label="Node Availability" value="98.4%" />
        <Metric label="Maintenance Completion" value="94%" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="font-semibold">Outages by district</p>
          <div className="mt-4 space-y-2">
            {DISTRICTS.map((d) => (
              <div key={d.name} className="flex items-center gap-3 text-sm">
                <span className="w-40 text-brand-100/70">{d.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-ink-700">
                  <div
                    className="h-full bg-brand-500"
                    style={{ width: `${Math.min(d.outages * 25, 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-brand-100/60">{d.outages}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-brand-100/40">
            Full Recharts visualizations arrive with the analytics phase.
          </p>
        </Card>
        <Card>
          <p className="font-semibold">SLA compliance by district</p>
          <div className="mt-4 space-y-2 text-sm">
            {DISTRICTS.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <span className="text-brand-100/70">{d.name}</span>
                <span className="font-mono text-status-normal">{d.sla}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
