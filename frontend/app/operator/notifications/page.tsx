"use client";

import { useState } from "react";
import { useHardware } from "@/lib/hardware-context";
import { notificationService, Notification } from "@/lib/notification-service";

export default function NotificationPanel() {
  const { telemetryByDevice } = useHardware();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const faultDevices = Object.values(telemetryByDevice).filter(
    (t: any) => t.fault || t.line_status === "FAULT"
  );

  async function triggerTestCall() {
    if (!notificationService) return;
    await notificationService.sendProximityAlerts("670632", "Line Break", 2.0);
  }

  async function triggerTestSMS() {
    if (!notificationService) return;
    await notificationService.sendProximityAlerts("670632", "Test Fault", 2.0);
  }

  async function triggerBulkSMS() {
    if (!notificationService) return;
    await notificationService.sendProximityAlerts("670632", "Maintenance", 5.0);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Notification Center</h1>
          <p className="text-sm text-brand-100/50">
            Manage SMS and voice call alerts for incidents.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Active Faults</p>
          <p className="mt-1 text-2xl font-bold text-status-fault">{faultDevices.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Notifications Sent</p>
          <p className="mt-1 text-2xl font-bold">{notifications.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Primary Operator</p>
          <p className="mt-1 text-lg font-mono">+91 62387 86706</p>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-medium mb-3">Test Notifications (Exotel)</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={triggerTestCall} className="btn-secondary text-sm">
            Test Voice Call
          </button>
          <button onClick={triggerTestSMS} className="btn-secondary text-sm">
            Test SMS
          </button>
          <button onClick={triggerBulkSMS} className="btn-primary text-sm">
            Test Bulk SMS
          </button>
        </div>
        <p className="mt-3 text-xs text-brand-100/40">
          Note: Exotel credentials must be configured in backend .env for live notifications.
        </p>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-medium mb-3">Notification Log</h3>
        {notifications.length === 0 ? (
          <p className="text-sm text-brand-100/40">No notifications sent yet.</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="rounded border border-brand-500/10 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className={`pill ${n.type === "sms" ? "pill-normal" : "pill-fault"}`}>
                    {n.type.toUpperCase()}
                  </span>
                  <span className="text-xs text-brand-100/40">
                    {new Date(n.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-brand-100/70">{n.message}</p>
                <p className="text-xs text-brand-100/40 font-mono">{n.recipient}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
