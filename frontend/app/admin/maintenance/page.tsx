"use client";

import { useState, useEffect } from "react";
import SimulatorStatusCard from "@/components/SimulatorStatusCard";

interface MaintenanceJob {
  id: string;
  location: string;
  faultType: string;
  operator: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  deadlineInMin: number;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
}

const INITIAL_JOBS: MaintenanceJob[] = [
  { id: "MJ-0011", location: "Fort Kochi", faultType: "Line Break", operator: "Ajay Kumar", priority: "HIGH", deadlineInMin: 45, status: "OPEN" },
  { id: "MJ-0012", location: "Mattancherry", faultType: "Maintenance", operator: "Priya Nair", priority: "MEDIUM", deadlineInMin: 120, status: "IN_PROGRESS" },
  { id: "MJ-0013", location: "Ernakulam South", faultType: "Pole Damage", operator: "Ravi Menon", priority: "HIGH", deadlineInMin: 30, status: "OVERDUE" },
  { id: "MJ-0014", location: "Vyttila", faultType: "Scheduled Checkup", operator: "Sneha Raj", priority: "LOW", deadlineInMin: 240, status: "OPEN" },
  { id: "MJ-0015", location: "Kadavanthra", faultType: "Line Break", operator: "Ajay Kumar", priority: "HIGH", deadlineInMin: 60, status: "COMPLETED" },
];

export default function AdminMaintenancePage() {
  const [jobs, setJobs] = useState<MaintenanceJob[]>(INITIAL_JOBS);
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [newDeadline, setNewDeadline] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newJob, setNewJob] = useState<{ location: string; faultType: string; operator: string; priority: "HIGH" | "MEDIUM" | "LOW"; deadlineInMin: number }>({ location: "", faultType: "", operator: "", priority: "MEDIUM", deadlineInMin: 60 });

  function updateDeadline(jobId: string, minutes: number) {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, deadlineInMin: minutes, status: j.status === "OVERDUE" && minutes > 0 ? "OPEN" as const : j.status } : j))
    );
    setEditingJob(null);
  }

  function addJob() {
    const id = `MJ-${String(jobs.length + 11).padStart(4, "0")}`;
    setJobs((prev) => [...prev, { ...newJob, id, status: "OPEN" }]);
    setShowAddModal(false);
    setNewJob({ location: "", faultType: "", operator: "", priority: "MEDIUM", deadlineInMin: 60 });
  }

  function markCompleted(jobId: string) {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "COMPLETED" as const } : j)));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Maintenance & SLA Management</h1>
          <p className="text-sm text-brand-100/50">Set and monitor operator deadlines for fault resolution and maintenance.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">+ New Job</button>
      </div>

      <section aria-label="Prototype simulator status" className="space-y-2">
        <h2 className="text-sm font-semibold text-brand-100/60">
          Prototype — simulated node
        </h2>
        <SimulatorStatusCard audience="admin" />
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Jobs" value={jobs.length} tone="default" />
        <StatCard label="Open" value={jobs.filter((j) => j.status === "OPEN").length} tone="maint" />
        <StatCard label="Overdue" value={jobs.filter((j) => j.status === "OVERDUE").length} tone="fault" />
        <StatCard label="Completed" value={jobs.filter((j) => j.status === "COMPLETED").length} tone="normal" />
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => (
          <div key={job.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-brand-300">{job.id}</span>
                  <PriorityPill priority={job.priority} />
                  <StatusPill status={job.status} />
                </div>
                <p className="text-sm font-medium">{job.location} — {job.faultType}</p>
                <p className="text-xs text-brand-100/50">Operator: {job.operator}</p>
              </div>
              <div className="flex items-center gap-3">
                {job.status !== "COMPLETED" && (
                  <>
                    <TimerDisplay minutes={job.deadlineInMin} status={job.status} />
                    <button onClick={() => setEditingJob(job.id)} className="btn-secondary text-xs">Set Timer</button>
                    <button onClick={() => markCompleted(job.id)} className="btn-primary text-xs">Complete</button>
                  </>
                )}
                {job.status === "COMPLETED" && <span className="pill pill-normal">Done</span>}
              </div>
            </div>
            {editingJob === job.id && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-brand-500/20 bg-ink-950/40 p-3">
                <label className="text-xs text-brand-100/60">SLA (minutes):</label>
                <input
                  type="number"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  placeholder={String(job.deadlineInMin)}
                  className="w-24 rounded border border-brand-500/20 bg-ink-950/60 px-2 py-1 text-sm"
                />
                <button onClick={() => updateDeadline(job.id, Number(newDeadline) || job.deadlineInMin)} className="btn-primary text-xs">Save</button>
                <button onClick={() => setEditingJob(null)} className="btn-ghost text-xs">Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4">
          <div className="card w-full max-w-md space-y-4 p-6">
            <h2 className="text-lg font-semibold">Create Maintenance Job</h2>
            <div className="space-y-3">
              <FieldInput label="Location" value={newJob.location} onChange={(v) => setNewJob((p) => ({ ...p, location: v }))} placeholder="e.g. Fort Kochi" />
              <FieldInput label="Fault Type" value={newJob.faultType} onChange={(v) => setNewJob((p) => ({ ...p, faultType: v }))} placeholder="e.g. Line Break" />
              <FieldInput label="Operator" value={newJob.operator} onChange={(v) => setNewJob((p) => ({ ...p, operator: v }))} placeholder="e.g. Ajay Kumar" />
              <div>
                <label className="text-xs text-brand-100/60">Priority</label>
                <select value={newJob.priority} onChange={(e) => setNewJob((p) => ({ ...p, priority: e.target.value as "HIGH" | "MEDIUM" | "LOW" }))} className="mt-1 w-full rounded border border-brand-500/20 bg-ink-950/60 px-2 py-1.5 text-sm">
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
              <FieldInput label="SLA (minutes)" value={String(newJob.deadlineInMin)} onChange={(v) => setNewJob((p) => ({ ...p, deadlineInMin: Number(v) || 60 }))} placeholder="60" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={addJob} className="btn-primary text-sm" disabled={!newJob.location || !newJob.faultType || !newJob.operator}>Create Job</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "default" | "normal" | "fault" | "maint" }) {
  const cls = tone === "fault" ? "text-status-fault" : tone === "normal" ? "text-status-normal" : tone === "maint" ? "text-status-maint" : "text-brand-100";
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-brand-100/40">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${cls}`}>{value}</p>
    </div>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const cls = priority === "HIGH" ? "pill-fault" : priority === "MEDIUM" ? "pill-maint" : "pill-unknown";
  return <span className={`pill ${cls}`}><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />{priority}</span>;
}

function StatusPill({ status }: { status: string }) {
  const cls = status === "COMPLETED" ? "pill-normal" : status === "OVERDUE" ? "pill-fault" : status === "IN_PROGRESS" ? "pill-maint" : "pill-unknown";
  return <span className={`pill ${cls}`}><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />{status.replace("_", " ")}</span>;
}

function TimerDisplay({ minutes, status }: { minutes: number; status: string }) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  useEffect(() => {
    if (status === "COMPLETED") return;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [status]);
  const breached = secondsLeft <= 0;
  const mm = String(Math.floor(Math.abs(secondsLeft) / 60)).padStart(2, "0");
  const ss = String(Math.abs(secondsLeft) % 60).padStart(2, "0");
  const cls = breached ? "text-status-fault animate-pulse-fault" : secondsLeft <= 900 ? "text-status-maint" : "text-status-normal";
  return <span className={`font-mono text-lg font-bold ${cls}`}>{breached ? "-" : ""}{mm}:{ss}</span>;
}

function FieldInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs text-brand-100/60">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded border border-brand-500/20 bg-ink-950/60 px-2 py-1.5 text-sm" />
    </div>
  );
}
