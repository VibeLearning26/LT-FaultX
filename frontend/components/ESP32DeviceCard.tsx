"use client";

import { useHardware, useDevice } from "@/lib/hardware-context";
import { StatusPill } from "@/components/ui";

export function ESP32DeviceCard({ deviceId, title }: { deviceId: string; title?: string }) {
  const { telemetry, deviceStatus } = useDevice(deviceId);
  const { connected, relayCommands, sendRelayCommand } = useHardware();
  
  const data = telemetry || deviceStatus;
  
  if (!data) {
    return (
      <div className="card p-4 text-center text-brand-100/50">
        <p>No data for {deviceId}</p>
        <p className="text-xs mt-1">Waiting for ESP32 telemetry...</p>
      </div>
    );
  }

  const lineStatus = telemetry?.line_status || deviceStatus?.line_status || "UNKNOWN";
  const isHealthy = lineStatus === "HEALTHY";
  const isFault = lineStatus === "FAULT" || telemetry?.fault === true || deviceStatus?.fault === true;
  const isIsolated = lineStatus === "ISOLATED";
  const isOnline = deviceStatus?.online ?? telemetry?.persisted ?? false;
  const commStatus = deviceStatus?.comm || (isOnline ? "OK" : "LOST");
  
  const voltage = (telemetry?.voltage ?? deviceStatus?.voltage) ?? null;
  const current = (telemetry?.current ?? deviceStatus?.current) ?? null;
  const relayState = telemetry?.relay_k1 ?? deviceStatus?.relay_state ?? false;
  const fault = telemetry?.fault ?? deviceStatus?.fault ?? false;
  const wifiRssi = (telemetry?.wifi_rssi ?? deviceStatus?.wifi_rssi) ?? null;
  const lastSeen = telemetry?.reading_at || deviceStatus?.last_seen || undefined;

  const pendingCommand = relayCommands.find(c => c.device_ref === deviceId && ["PENDING", "SENT"].includes(c.status));

  const formatTime = (ts: string | undefined) => {
    if (!ts) return "—";
    try { return new Date(ts).toLocaleTimeString(); } catch { return ts; }
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{title || deviceId}</h3>
          <p className="text-xs text-brand-100/50 font-mono">{deviceId}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill 
            kind={isOnline ? "normal" : "fault"} 
            label={isOnline ? "ONLINE" : "OFFLINE"} 
          />
          <StatusPill 
            kind={connected ? "normal" : "unknown"} 
            label={connected ? "WS Connected" : "WS Disconnected"} 
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Voltage" value={voltage !== null ? `${voltage.toFixed(1)} V` : "—"} tone={isHealthy ? "normal" : isFault ? "fault" : "default"} />
        <MetricCard label="Current" value={current !== null ? `${current.toFixed(2)} A` : "—"} tone="default" />
        <MetricCard label="Line Status" value={lineStatus} tone={isHealthy ? "normal" : isFault ? "fault" : isIsolated ? "maint" : "unknown"} />
        <MetricCard label="Communication" value={commStatus} tone={commStatus === "OK" ? "normal" : commStatus === "DEGRADED" ? "maint" : "fault"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Relay" value={relayState ? "CLOSED (ON)" : "OPEN (OFF)"} tone={relayState ? "normal" : "fault"} />
        <MetricCard label="Fault" value={fault ? "YES" : "NO"} tone={fault ? "fault" : "normal"} />
        <MetricCard label="WiFi RSSI" value={wifiRssi !== null ? `${wifiRssi} dBm` : "—"} tone={wifiRssi !== null && wifiRssi > -70 ? "normal" : wifiRssi !== null && wifiRssi > -80 ? "maint" : "fault"} />
        <MetricCard label="Last Seen" value={formatTime(lastSeen)} tone="default" />
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-500/10">
        <button
          className="btn-primary text-sm"
          onClick={() => sendRelayCommand(deviceId, "k1", !relayState)}
          disabled={!!pendingCommand}
        >
          {pendingCommand ? `Relay ${pendingCommand.status}...` : (relayState ? "Open Relay" : "Close Relay")}
        </button>
        <button className="btn-secondary text-sm" onClick={() => sendRelayCommand(deviceId, "k1", true)}>
          Force Close
        </button>
        <button className="btn-ghost text-sm" onClick={() => sendRelayCommand(deviceId, "k1", false)}>
          Force Open
        </button>
        {pendingCommand && (
          <StatusPill kind="maint" label={`Command: ${pendingCommand.status}`} />
        )}
      </div>

      {telemetry && (
        <p className="text-xs text-brand-100/40">
          Telemetry persisted: {telemetry.persisted ? "Yes" : "No (simulation)"} · Reading at {formatTime(telemetry.reading_at)}
        </p>
      )}
    </div>
  );
}

function MetricCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "normal" | "fault" | "maint" | "unknown" }) {
  const toneCls =
    tone === "fault" ? "text-status-fault" :
    tone === "normal" ? "text-status-normal" :
    tone === "maint" ? "text-status-maint" :
    tone === "unknown" ? "text-brand-100/40" :
    "text-brand-100";

  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-brand-100/40">{label}</p>
      <p className={`mt-1 text-xl font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}