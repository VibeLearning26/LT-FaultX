"use client";

import { useState } from "react";
import SimulatorStatusCard from "@/components/SimulatorStatusCard";

interface MaintenanceReport {
  id: string;
  location: string;
  pincode: string;
  faultType: string;
  reportedBy: string;
  reportedAt: string;
  status: "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "VERIFIED";
  assignedTo?: string;
  slaDeadline: string;
  actualCompletion?: string;
  userFeedback?: string;
  ksebVerification?: string;
}

const MOCK_REPORTS: MaintenanceReport[] = [
  { id: "R001", location: "Fort Kochi", pincode: "682001", faultType: "Line Break", reportedBy: "User Report", reportedAt: "2026-08-29 09:00", status: "COMPLETED", assignedTo: "Ajay Kumar", slaDeadline: "2026-08-29 10:00", actualCompletion: "2026-08-29 09:45", userFeedback: "✅ Electricity restored. Good work.", ksebVerification: "Verified by KSEB officer" },
  { id: "R002", location: "Mattancherry", pincode: "682002", faultType: "Pole Damage", reportedBy: "IoT Sensor", reportedAt: "2026-08-29 10:30", status: "IN_PROGRESS", assignedTo: "Priya Nair", slaDeadline: "2026-08-29 12:30" },
  { id: "R003", location: "Ernakulam South", pincode: "682016", faultType: "Line Break", reportedBy: "KSEB Patrol", reportedAt: "2026-08-29 11:00", status: "ASSIGNED", assignedTo: "Ravi Menon", slaDeadline: "2026-08-29 12:00" },
  { id: "R004", location: "Vyttila", pincode: "682019", faultType: "Scheduled Maintenance", reportedBy: "KSEB Schedule", reportedAt: "2026-08-28 08:00", status: "VERIFIED", assignedTo: "Sneha Raj", slaDeadline: "2026-08-28 12:00", actualCompletion: "2026-08-28 11:30", userFeedback: "✅ Maintenance completed on time.", ksebVerification: "Monthly checkup verified" },
  { id: "R005", location: "Kadavanthra", pincode: "682020", faultType: "Transformer Fault", reportedBy: "User Report", reportedAt: "2026-08-29 07:00", status: "PENDING", slaDeadline: "2026-08-29 11:00" },
];

export default function OperatorMaintenancePage() {
  const [reports, setReports] = useState<MaintenanceReport[]>(MOCK_REPORTS);
  const [filter, setFilter] = useState<string>("ALL");

  const filtered = filter === "ALL" ? reports : reports.filter((r) => r.status === filter);

  function markCompleted(reportId: string) {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId ? { ...r, status: "COMPLETED" as const, actualCompletion: new Date().toLocaleString("en-GB", { hour12: false }).replace(",", "") } : r
      )
    );
  }

  function verifyRestoration(reportId: string) {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId ? { ...r, status: "VERIFIED" as const, ksebVerification: `Verified by KSEB officer at ${new Date().toLocaleTimeString()}` } : r
      )
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">KSEB Maintenance Reports</h1>
          <p className="text-sm text-brand-100/50">Track faults, worker assignments, and completion status.</p>
        </div>
      </div>

      <section aria-label="Prototype simulator status" className="space-y-2">
        <h2 className="text-sm font-semibold text-brand-100/60">
          Prototype — simulated node
        </h2>
        <SimulatorStatusCard audience="operator" />
      </section>

      <div className="flex flex-wrap gap-2">
        {["ALL", "PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "VERIFIED"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`pill ${filter === f ? "pill-normal" : "pill-unknown"}`}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filtered.map((report) => (
          <div key={report.id} className="card p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-brand-300">{report.id}</span>
                  <StatusBadge status={report.status} />
                </div>
                <p className="mt-1 font-medium">{report.location} ({report.pincode}) — {report.faultType}</p>
                <p className="text-xs text-brand-100/50">Reported by: {report.reportedBy} at {report.reportedAt}</p>
                {report.assignedTo && <p className="text-xs text-brand-100/50">Assigned to: {report.assignedTo}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-brand-100/40">SLA Deadline</p>
                <p className="font-mono text-sm">{report.slaDeadline}</p>
              </div>
            </div>

            {report.actualCompletion && (
              <div className="rounded bg-status-normal/10 p-2 text-xs text-status-normal">
                ✅ Completed at: {report.actualCompletion}
              </div>
            )}
            {report.userFeedback && (
              <div className="rounded bg-brand-500/5 p-2 text-xs text-brand-100/70">
                👤 User: {report.userFeedback}
              </div>
            )}
            {report.ksebVerification && (
              <div className="rounded bg-status-normal/10 p-2 text-xs text-status-normal">
                ✓ {report.ksebVerification}
              </div>
            )}

            {report.status === "IN_PROGRESS" && (
              <div className="flex gap-2">
                <button onClick={() => markCompleted(report.id)} className="btn-primary text-xs">Mark Completed</button>
              </div>
            )}
            {report.status === "COMPLETED" && (
              <div className="flex gap-2">
                <button onClick={() => verifyRestoration(report.id)} className="btn-secondary text-xs">Verify Restoration</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "pill-unknown",
    ASSIGNED: "pill-maint",
    IN_PROGRESS: "pill-maint",
    COMPLETED: "pill-normal",
    VERIFIED: "pill-normal",
  };
  const icons: Record<string, string> = { PENDING: "⏳", ASSIGNED: "📋", IN_PROGRESS: "🔧", COMPLETED: "✅", VERIFIED: "✓" };
  return (
    <span className={`pill ${map[status] ?? "pill-unknown"}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {icons[status]} {status}
    </span>
  );
}
