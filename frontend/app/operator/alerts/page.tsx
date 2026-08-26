import { PageHeader, SimBadge, StatusPill, Card } from "@/components/ui";
import { ALERTS } from "@/lib/demo-data";

export default function OperatorAlertsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        subtitle="System notifications for faults, SLA warnings and telemetry events."
        right={<SimBadge />}
      />

      <div className="space-y-3">
        {ALERTS.map((a) => (
          <Card key={a.id} className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <StatusPill kind={a.kind} pulse={a.kind === "fault"} />
                <span className="font-medium">{a.title}</span>
              </div>
              <p className="mt-1 text-sm text-brand-100/55">{a.detail}</p>
            </div>
            <span className="shrink-0 text-xs text-brand-100/40">{a.time}</span>
          </Card>
        ))}
      </div>

      <p className="text-xs text-brand-100/40">
        Delivery channels (SMS, email, push, call) are handled by a replaceable
        NotificationService with a mock provider (Phase 7).
      </p>
    </div>
  );
}
