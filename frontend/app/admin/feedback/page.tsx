import { PageHeader, SimBadge, Card } from "@/components/ui";

const METRICS = [
  { label: "Reliability", value: 4.2 },
  { label: "Restoration speed", value: 3.8 },
  { label: "Maintenance quality", value: 4.4 },
  { label: "Communication", value: 3.6 },
  { label: "Overall service", value: 4.1 },
];

const COMMENTS = [
  { pincode: "682020", text: "Power restored quickly, good communication.", rating: 5 },
  { pincode: "682019", text: "Took a while but resolved.", rating: 3 },
  { pincode: "682016", text: "No updates during the outage.", rating: 2 },
];

export default function AdminFeedbackPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Citizen Feedback" subtitle="Aggregated monthly service ratings." right={<SimBadge />} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {METRICS.map((m) => (
          <Card key={m.label}>
            <p className="text-xs uppercase tracking-wide text-brand-100/40">{m.label}</p>
            <p className="mt-2 text-2xl font-bold text-status-maint">{m.value.toFixed(1)}</p>
            <p className="text-xs text-brand-100/40">of 5</p>
          </Card>
        ))}
      </div>

      <Card>
        <p className="font-semibold">Recent comments</p>
        <div className="mt-3 space-y-3">
          {COMMENTS.map((c, i) => (
            <div key={i} className="flex items-start justify-between gap-4 border-b border-brand-500/5 pb-3 last:border-0">
              <div>
                <p className="font-mono text-xs text-brand-100/40">{c.pincode}</p>
                <p className="text-sm text-brand-100/70">{c.text}</p>
              </div>
              <span className="shrink-0 text-status-maint">{"★".repeat(c.rating)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
