import { PageHeader, SimBadge, StatusPill } from "@/components/ui";
import LiveMapLoader from "@/components/LiveMapLoader";

export default function UserMapPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Public Live Map"
        subtitle="Electricity availability across your area."
        right={<SimBadge />}
      />

      <LiveMapLoader role="USER" />

      <div className="flex flex-wrap gap-2">
        <StatusPill kind="normal" label="Available" />
        <StatusPill kind="fault" label="Outage" />
        <StatusPill kind="maint" label="Maintenance" />
        <StatusPill kind="unknown" label="Unknown" />
      </div>
      <p className="text-xs text-brand-100/40">
        Public view — sensitive infrastructure details and field-crew locations are not shown.
      </p>
    </div>
  );
}
