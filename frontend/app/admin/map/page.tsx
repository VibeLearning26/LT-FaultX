import { PageHeader, SimBadge, StatusPill } from "@/components/ui";
import LiveMapLoader from "@/components/LiveMapLoader";

export default function AdminMapPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Kerala Map"
        subtitle="Statewide interactive map — devices, faults, lines and field crew."
        right={<SimBadge />}
      />

      <LiveMapLoader role="ADMIN" />

      <div className="flex flex-wrap gap-2">
        <StatusPill kind="normal" label="Available" />
        <StatusPill kind="fault" label="Fault / outage" />
        <StatusPill kind="maint" label="Maintenance" />
        <StatusPill kind="unknown" label="Unknown / stale" />
      </div>
    </div>
  );
}
