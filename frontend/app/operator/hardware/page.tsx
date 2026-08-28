"use client";

import { PageHeader, SimBadge, StatusPill } from "@/components/ui";
import { ESP32DeviceCard } from "@/components/ESP32DeviceCard";
import { useHardware } from "@/lib/hardware-context";

const DEVICE_IDS = ["ESP32-POLE-01", "ESP32-POLE-02", "ESP32-POLE-03"];

export default function OperatorHardwarePage() {
  const { telemetry, deviceStatus, connected, relayCommands } = useHardware();
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hardware Monitor"
        subtitle="Real-time ESP32 pole telemetry and relay control."
        right={
          <div className="flex items-center gap-2">
            <StatusPill kind={connected ? "normal" : "fault"} label={connected ? "WS Connected" : "WS Disconnected"} />
            <SimBadge />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEVICE_IDS.map((deviceId) => (
          <ESP32DeviceCard key={deviceId} deviceId={deviceId} title={`Pole ${deviceId.split("-")[2]}`} />
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-4">Recent Relay Commands</h3>
        <div className="space-y-2">
          {relayCommands.slice(0, 15).map((cmd) => (
            <div key={cmd.id} className="flex items-center justify-between text-sm p-3 card">
              <div className="flex items-center gap-3">
                <span className="font-mono text-brand-300">{cmd.device_ref}</span>
                <span className="text-xs uppercase tracking-wide text-brand-100/50">{cmd.relay.toUpperCase()}</span>
                <span className="font-mono text-brand-100/60">{cmd.desired_state ? "CLOSE" : "OPEN"}</span>
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
            <p className="text-sm text-brand-100/50 text-center py-4">No relay commands yet</p>
          )}
        </div>
      </div>
    </div>
  );
}