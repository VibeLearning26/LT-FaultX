import { PageHeader, SimBadge, StatusPill, Card } from "@/components/ui";
import { FAULTS } from "@/lib/demo-data";

const ACTIONS = ["Acknowledge", "Assign", "Isolate", "Mark Restored", "Close"];

export default function OperatorFaultsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Active Faults"
        subtitle="Confirmed and suspected faults with estimated segment localization."
        right={<SimBadge />}
      />

      {FAULTS.map((f) => (
        <Card key={f.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-brand-300">{f.id}</span>
              <StatusPill kind="fault" label={f.status} pulse />
            </div>
            <span className="text-xs text-brand-100/40">Detected {f.detectedAt}</span>
          </div>

          <p className="mt-2 text-sm text-brand-100/70">{f.type}</p>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-brand-100/40">Estimated segment</p>
              <p className="font-mono text-status-fault">{f.segment}</p>
            </div>
            <div>
              <p className="text-xs text-brand-100/40">Location</p>
              <p>{f.location}</p>
            </div>
            <div>
              <p className="text-xs text-brand-100/40">Last healthy node</p>
              <p className="font-mono text-status-normal">{f.lastHealthy}</p>
            </div>
            <div>
              <p className="text-xs text-brand-100/40">First failed node</p>
              <p className="font-mono text-status-fault">{f.firstFailed}</p>
            </div>
            <div>
              <p className="text-xs text-brand-100/40">Isolation</p>
              <p>{f.isolation}</p>
            </div>
            <div>
              <p className="text-xs text-brand-100/40">Maintenance</p>
              <p>{f.maintenance}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <button key={a} className="btn-ghost text-xs" title="Requires backend authorization (Phase 5)">
                {a}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-brand-100/40">
            Estimated segment only — not an exact physical distance. All control actions
            require backend authorization and are audited.
          </p>
        </Card>
      ))}
    </div>
  );
}
