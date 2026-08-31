"use client";

import { useState, useEffect } from "react";
import { notificationService, Notification } from "@/lib/notification-service";
import { useHardware } from "@/lib/hardware-context";

export default function OperatorAlertsPage() {
  const { telemetryByDevice } = useHardware();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [triggerPincode, setTriggerPincode] = useState("670632");
  const [triggerFaultType, setTriggerFaultType] = useState("Line Break");
  const [triggerRadius, setTriggerRadius] = useState(2);

  useEffect(() => {
    if (!notificationService) return;
    const unsub = notificationService.subscribe(() => {
      setNotifications(notificationService!.getNotifications());
    });
    setNotifications(notificationService.getNotifications());
    return unsub;
  }, []);

  async function triggerProximityAlert() {
    if (!notificationService) return;
    await notificationService.sendProximityAlerts(triggerPincode, triggerFaultType, triggerRadius);
    setShowTriggerModal(false);
  }

  const faultDevices = Object.values(telemetryByDevice).filter((t: any) => t.fault || t.line_status === "FAULT");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Automated Alerts & Notifications</h1>
          <p className="text-sm text-brand-100/50">Automatic messaging and phone calls for fault events.</p>
        </div>
        <button onClick={() => setShowTriggerModal(true)} className="btn-primary">+ Trigger Alert</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Total Sent</p>
          <p className="mt-1 text-2xl font-bold">{notifications.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">SMS</p>
          <p className="mt-1 text-2xl font-bold text-status-normal">{notifications.filter((n) => n.type === "sms").length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Calls</p>
          <p className="mt-1 text-2xl font-bold text-status-fault">{notifications.filter((n) => n.type === "call").length}</p>
        </div>
      </div>

      {faultDevices.length > 0 && (
        <div className="rounded-lg border border-status-fault/40 bg-status-fault/10 p-4">
          <p className="font-semibold text-status-fault">⚠️ Active Faults — Auto-Alert Recommended</p>
          <p className="mt-1 text-sm text-brand-100/60">{faultDevices.length} device(s) reporting faults. Trigger proximity alerts to notify nearby users.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {faultDevices.map((d: any) => (
              <span key={d.device_id} className="rounded bg-ink-950/40 px-2 py-1 text-xs font-mono">{d.device_id}</span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Notification Log</h2>
        {notifications.length === 0 ? (
          <div className="card p-8 text-center text-brand-100/40">
            <p>No notifications sent yet.</p>
            <p className="mt-1 text-xs">Trigger an alert or detect a fault to see automated messages here.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`pill ${n.type === "sms" ? "pill-normal" : "pill-fault"}`}>
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                    {n.type.toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{n.recipientName}</p>
                    <p className="text-xs text-brand-100/50 font-mono">{n.recipient}</p>
                  </div>
                </div>
                <span className={`pill ${n.priority === "critical" ? "pill-fault" : n.priority === "high" ? "pill-maint" : "pill-unknown"}`}>{n.priority}</span>
              </div>
              <p className="mt-2 text-sm text-brand-100/70 line-clamp-2">{n.message}</p>
              <p className="mt-1 text-xs text-brand-100/40">{new Date(n.timestamp).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>

      {showTriggerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4">
          <div className="card w-full max-w-md space-y-4 p-6">
            <h2 className="text-lg font-semibold">Trigger Proximity Alert</h2>
            <p className="text-sm text-brand-100/60">Automatically send SMS and phone calls to users near the fault location.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-brand-100/60">Pincode</label>
                <input value={triggerPincode} onChange={(e) => setTriggerPincode(e.target.value)} className="mt-1 w-full rounded border border-brand-500/20 bg-ink-950/60 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-brand-100/60">Fault Type</label>
                <select value={triggerFaultType} onChange={(e) => setTriggerFaultType(e.target.value)} className="mt-1 w-full rounded border border-brand-500/20 bg-ink-950/60 px-2 py-1.5 text-sm">
                  <option>Line Break</option>
                  <option>Pole Damage</option>
                  <option>Transformer Fault</option>
                  <option>Scheduled Maintenance</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-brand-100/60">Radius (km)</label>
                <input type="number" value={triggerRadius} onChange={(e) => setTriggerRadius(Number(e.target.value))} className="mt-1 w-full rounded border border-brand-500/20 bg-ink-950/60 px-2 py-1.5 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowTriggerModal(false)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={triggerProximityAlert} className="btn-primary text-sm">Send Alerts</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
