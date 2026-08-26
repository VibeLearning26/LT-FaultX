import { PageHeader, SimBadge, Card } from "@/components/ui";
import MaintenanceTimer from "@/components/MaintenanceTimer";
import { MAINTENANCE } from "@/lib/demo-data";

const LIFECYCLE = [
  "REPORTED",
  "ASSIGNED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "COMPLETED",
  "VERIFIED",
  "CLOSED",
];

export default function OperatorMaintenancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        subtitle="Jobs created from confirmed faults, with live SLA countdown."
        right={<SimBadge />}
      />

      <Card>
        <p className="text-xs uppercase tracking-wide text-brand-100/40">Lifecycle</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {LIFECYCLE.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className="rounded border border-brand-500/20 px-2 py-0.5 font-mono text-brand-100/60">
                {s}
              </span>
              {i < LIFECYCLE.length - 1 && <span className="text-brand-100/30">→</span>}
            </span>
          ))}
        </div>
      </Card>

      {MAINTENANCE.map((m) => (
        <Card key={m.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-brand-300">{m.id}</span>
              <span className="text-xs text-brand-100/40">Fault {m.faultId}</span>
            </div>
            <MaintenanceTimer deadlineInMin={m.deadlineInMin} />
          </div>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-brand-100/40">Location</p>
              <p>{m.location}</p>
            </div>
            <div>
              <p className="text-xs text-brand-100/40">Fault type</p>
              <p>{m.faultType}</p>
            </div>
            <div>
              <p className="text-xs text-brand-100/40">Assigned</p>
              <p>{m.operator}</p>
            </div>
            <div>
              <p className="text-xs text-brand-100/40">Priority</p>
              <p
                className={
                  m.priority === "HIGH"
                    ? "text-status-fault"
                    : m.priority === "MEDIUM"
                      ? "text-status-maint"
                      : "text-brand-100/70"
                }
              >
                {m.priority}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn-ghost text-xs">Acknowledge</button>
            <button className="btn-ghost text-xs">Mark Completed</button>
            <button className="btn-ghost text-xs">Verify Restoration</button>
          </div>
          <p className="mt-3 text-xs text-brand-100/40">
            Timer duration is a configurable SLA target (set by an administrator) — not an
            official statutory value. Completion does not auto-set power to restored.
          </p>
        </Card>
      ))}
    </div>
  );
}
