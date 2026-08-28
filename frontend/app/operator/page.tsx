"use client";

import { useHardware } from "@/lib/hardware-context";
import { ESP32DeviceCard } from "@/components/ESP32DeviceCard";
import { StatusPill } from "@/components/ui";

const DEVICE_IDS = ["ESP32-POLE-01", "ESP32-POLE-02", "ESP32-POLE-03"];

export default function OperatorDashboard() {
  const { telemetry, deviceStatus, connected, relayCommands } = useHardware();
  
  // Compute summary metrics from live data
  const allDevices = [...new Set([
    ...(telemetry ? [telemetry.device_id] : []),
    ...(deviceStatus ? [deviceStatus.device_id] : []),
    ...relayCommands.map(c => c.device_ref),
    ...DEVICE_IDS,
  ])];
  
  const onlineDevices = allDevices.filter(id => {
    const status = deviceStatus?.device_id === id ? deviceStatus : null;
    const t = telemetry?.device_id === id ? telemetry : null;
    return status?.online || t?.persisted;
  });
  
  const faultDevices = allDevices.filter(id => {
    const t = telemetry?.device_id === id ? telemetry : null;
    return t?.fault || t?.line_status === "FAULT";
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Control Center</h1>
          <p className="text-sm text-brand-100/50">
            Live overview of the LT network with ESP32 hardware telemetry.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill kind={connected ? "normal" : "fault"} label={connected ? "Backend Connected" : "Backend Disconnected"} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Devices Online" value={`${onlineDevices.length} / ${allDevices.length}`} tone={onlineDevices.length === allDevices.length ? "normal" : "fault"} note="ESP32 poles" />
        <MetricCard label="Active Faults" value={faultDevices.length.toString()} tone={faultDevices.length > 0 ? "fault" : "normal"} note={faultDevices.length > 0 ? "Needs attention" : "None"} />
        <MetricCard label="Backend" value={connected ? "Connected" : "Disconnected"} tone={connected ? "normal" : "fault"} note="WebSocket" />
        <MetricCard label="Mode" value="LIVE" tone="maint" note="ESP32 hardware" />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">ESP32 Pole Devices</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEVICE_IDS.map((deviceId) => (
            <ESP32DeviceCard key={deviceId} deviceId={deviceId} title={`Pole ${deviceId.split("-")[2]}`} />
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold">Latest Relay Commands</p>
        </div>
        <div className="space-y-2">
          {relayCommands.slice(0, 10).map((cmd) => (
            <div key={cmd.id} className="flex items-center justify-between text-sm p-3 card">
              <div className="flex items-center gap-3">
                <span className="font-mono text-brand-300">{cmd.device_ref}</span>
                <span className="text-xs uppercase tracking-wide text-brand-100/50">{cmd.relay.toUpperCase()}</span>
                <StatusPill 
                  kind={
                    cmd.status === "ACKED" ? "normal" :
                    cmd.status === "SENT" ? "maint" :
                    cmd.status === "PENDING" ? "info" :
                    "fault"
                  } 
                  label={cmd.status}
                />
              </div>
              <div className="text-xs text-brand-100/50 font-mono">
                {new Date(cmd.issued_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {relayCommands.length === 0 && (
            <p className="text-sm text-brand-100/50 text-center py-4">No recent relay commands</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone = "default", note }: { label: string; value: string; tone?: "default" | "normal" | "fault" | "maint"; note?: string }) {
  const toneCls =
    tone === "fault" ? "text-status-fault" :
    tone === "normal" ? "text-status-normal" :
    tone === "maint" ? "text-status-maint" :
    "text-brand-100";

  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-brand-100/40">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${toneCls}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-brand-100/40">{note}</p>}
    </div>
  );
}