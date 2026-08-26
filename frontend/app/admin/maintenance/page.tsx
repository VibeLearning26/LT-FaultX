import { PageHeader, SimBadge, Card } from "@/components/ui";
import MaintenanceTimer from "@/components/MaintenanceTimer";
import { MAINTENANCE } from "@/lib/demo-data";

export default function AdminMaintenancePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Maintenance" subtitle="Statewide maintenance jobs and SLA status." right={<SimBadge />} />
      <div className="grid gap-4">
        {MAINTENANCE.map((m) => (
          <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-mono text-brand-300">{m.id}</span>
              <span className="ml-2 text-sm text-brand-100/60">{m.location}</span>
              <p className="text-xs text-brand-100/40">
                {m.faultType} · {m.operator} · {m.priority}
              </p>
            </div>
            <MaintenanceTimer deadlineInMin={m.deadlineInMin} />
          </Card>
        ))}
      </div>
    </div>
  );
}
