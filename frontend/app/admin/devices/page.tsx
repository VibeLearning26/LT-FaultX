import { PageHeader, SimBadge, StatusPill } from "@/components/ui";
import { ESP32DeviceCard } from "@/components/ESP32DeviceCard";

const DEVICE_IDS = ["ESP32-POLE-01", "ESP32-POLE-02", "ESP32-POLE-03"];

export default function AdminDevicesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="ESP32 Devices"
        subtitle="Manage and monitor ESP32-based LT monitoring poles."
        right={<SimBadge />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEVICE_IDS.map((deviceId) => (
          <ESP32DeviceCard key={deviceId} deviceId={deviceId} title={`Pole ${deviceId.split("-")[2]}`} />
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-4">Add New ESP32 Device</h3>
        <form className="space-y-4 max-w-md">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-brand-100/50 mb-1">Device ID</label>
              <input
                type="text"
                placeholder="ESP32-POLE-04"
                className="w-full rounded-lg border border-brand-500/20 bg-ink-950/60 px-3 py-2 text-brand-50 placeholder:text-brand-100/30 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="block text-xs text-brand-100/50 mb-1">API Key</label>
              <input
                type="password"
                placeholder="Auto-generated or enter manually"
                className="w-full rounded-lg border border-brand-500/20 bg-ink-950/60 px-3 py-2 text-brand-50 placeholder:text-brand-100/30 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-brand-100/50 mb-1">Location (Pincode)</label>
            <input
              type="text"
              placeholder="682001"
              className="w-full rounded-lg border border-brand-500/20 bg-ink-950/60 px-3 py-2 text-brand-50 placeholder:text-brand-100/30 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              Register Device
            </button>
            <button type="button" className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}