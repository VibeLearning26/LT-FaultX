"use client";

import { useHardware } from "@/lib/hardware-context";
import FaultMap from "@/components/FaultMap";

export default function AdminDashboard() {
  const { telemetryByDevice } = useHardware();

  const devices = Object.values(telemetryByDevice);
  const faultDevices = devices.filter((d: any) => d.fault || d.line_status === "FAULT");
  const onlineDevices = devices.filter((d: any) => d.persisted || d.line_status);
  const totalVoltage = devices.reduce((sum: number, d: any) => sum + (d.voltage || 0), 0);
  const avgVoltage = devices.length > 0 ? (totalVoltage / devices.length).toFixed(1) : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Government Overview</h1>
        <p className="text-sm text-brand-100/50">
          Real-time statewide analytics from IoT sensor network.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Active Faults</p>
          <p className={`mt-2 text-3xl font-bold ${faultDevices.length > 0 ? "text-status-fault" : "text-status-normal"}`}>
            {faultDevices.length}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Avg Voltage</p>
          <p className="mt-2 text-3xl font-bold text-brand-100">{avgVoltage}V</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">SLA Compliance</p>
          <p className="mt-2 text-3xl font-bold text-status-normal">
            {devices.length > 0 ? Math.round(((devices.length - faultDevices.length) / devices.length) * 100) : 100}%
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Devices Online</p>
          <p className="mt-2 text-3xl font-bold text-status-normal">{onlineDevices.length}</p>
        </div>
      </div>

      <div className="card p-5">
        <p className="font-semibold mb-3">Live Fault Map</p>
        <div className="h-[400px]">
          <FaultMap />
        </div>
      </div>

      {faultDevices.length > 0 && (
        <div className="rounded-lg border border-status-fault/40 bg-status-fault/10 p-4">
          <p className="font-semibold text-status-fault">⚠️ Active Faults</p>
          <div className="mt-2 space-y-1">
            {faultDevices.map((d: any) => (
              <p key={d.device_id} className="text-sm text-brand-100/70">
                • {d.device_id} — V: {d.voltage ?? "—"}V, I: {d.current ?? "—"}A
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
