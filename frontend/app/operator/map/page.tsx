import { PageHeader, SimBadge, StatusPill } from "@/components/ui";
import LiveMapLoader from "@/components/LiveMapLoader";

export default function OperatorMapPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Map"
        subtitle="Interactive Kerala map — LT devices, line segments, faults and field crew."
        right={<SimBadge />}
      />

      <LiveMapLoader role="OPERATOR" />

      <div className="flex flex-wrap gap-2">
        <StatusPill kind="normal" label="Available" />
        <StatusPill kind="fault" label="Fault / outage" />
        <StatusPill kind="maint" label="Maintenance" />
        <StatusPill kind="unknown" label="Unknown / stale" />
      </div>
      <p className="text-xs text-brand-100/40">
        Estimated fault segment: NODE_03 → NODE_04. Estimated only — not an exact distance.
      </p>
    </div>
  );
}
