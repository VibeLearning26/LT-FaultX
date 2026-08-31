"use client";

import { useState } from "react";

interface MonthlyCheckup {
  id: string;
  pincode: string;
  locality: string;
  workerName: string;
  scheduledDate: string;
  completedDate?: string;
  status: "SCHEDULED" | "COMPLETED" | "OVERDUE";
  userRating?: number;
  userComments?: string;
  ksebNotes?: string;
  lineCondition: "GOOD" | "FAIR" | "POOR" | "CRITICAL";
  polesInspected: number;
  issuesFound: number;
}

const MOCK_CHECKUPS: MonthlyCheckup[] = [
  { id: "MC001", pincode: "682001", locality: "Fort Kochi", workerName: "Ajay Kumar", scheduledDate: "2026-08-15", completedDate: "2026-08-15", status: "COMPLETED", userRating: 4, userComments: "Good work, line is in good condition.", ksebNotes: "Routine checkup completed. No major issues.", lineCondition: "GOOD", polesInspected: 12, issuesFound: 0 },
  { id: "MC002", pincode: "682002", locality: "Mattancherry", workerName: "Priya Nair", scheduledDate: "2026-08-20", completedDate: "2026-08-20", status: "COMPLETED", userRating: 5, userComments: "Excellent maintenance work!", ksebNotes: "Replaced 1 damaged insulator.", lineCondition: "GOOD", polesInspected: 8, issuesFound: 1 },
  { id: "MC003", pincode: "682016", locality: "Ernakulam South", workerName: "Ravi Menon", scheduledDate: "2026-08-25", status: "OVERDUE", lineCondition: "FAIR", polesInspected: 0, issuesFound: 0 },
  { id: "MC004", pincode: "682019", locality: "Vyttila", workerName: "Sneha Raj", scheduledDate: "2026-08-28", completedDate: "2026-08-28", status: "COMPLETED", userRating: 3, userComments: "Average work, some lines still look old.", ksebNotes: "Scheduled replacement for next month.", lineCondition: "FAIR", polesInspected: 15, issuesFound: 3 },
  { id: "MC005", pincode: "682020", locality: "Kadavanthra", workerName: "Ajay Kumar", scheduledDate: "2026-09-01", status: "SCHEDULED", lineCondition: "GOOD", polesInspected: 0, issuesFound: 0 },
];

export default function AdminFeedbackPage() {
  const [checkups, setCheckups] = useState<MonthlyCheckup[]>(MOCK_CHECKUPS);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [newFeedback, setNewFeedback] = useState({ pincode: "", rating: 5, comments: "" });

  const avgRating = checkups.filter((c) => c.userRating).reduce((sum, c) => sum + (c.userRating || 0), 0) / (checkups.filter((c) => c.userRating).length || 1);
  const completed = checkups.filter((c) => c.status === "COMPLETED").length;
  const overdue = checkups.filter((c) => c.status === "OVERDUE").length;

  function submitFeedback() {
    setCheckups((prev) =>
      prev.map((c) =>
        c.pincode === newFeedback.pincode && c.status === "COMPLETED"
          ? { ...c, userRating: newFeedback.rating, userComments: c.userComments ? `${c.userComments} | ${newFeedback.comments}` : newFeedback.comments }
          : c
      )
    );
    setShowSubmitModal(false);
    setNewFeedback({ pincode: "", rating: 5, comments: "" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Monthly Checkup & Feedback</h1>
          <p className="text-sm text-brand-100/50">KSEB worker performance and user feedback for line maintenance.</p>
        </div>
        <button onClick={() => setShowSubmitModal(true)} className="btn-primary">+ Submit Feedback</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card p-4"><p className="text-xs uppercase tracking-wide text-brand-100/40">Total Checkups</p><p className="mt-1 text-2xl font-bold">{checkups.length}</p></div>
        <div className="card p-4"><p className="text-xs uppercase tracking-wide text-brand-100/40">Completed</p><p className="mt-1 text-2xl font-bold text-status-normal">{completed}</p></div>
        <div className="card p-4"><p className="text-xs uppercase tracking-wide text-brand-100/40">Overdue</p><p className="mt-1 text-2xl font-bold text-status-fault">{overdue}</p></div>
        <div className="card p-4"><p className="text-xs uppercase tracking-wide text-brand-100/40">Avg Rating</p><p className="mt-1 text-2xl font-bold text-status-maint">⭐ {avgRating.toFixed(1)}/5</p></div>
      </div>

      <div className="grid gap-4">
        {checkups.map((c) => (
          <div key={c.id} className="card p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-brand-300">{c.id}</span>
                  <CheckupStatusBadge status={c.status} />
                  <LineConditionBadge condition={c.lineCondition} />
                </div>
                <p className="mt-1 font-medium">{c.locality} ({c.pincode})</p>
                <p className="text-xs text-brand-100/50">Worker: {c.workerName} | Scheduled: {c.scheduledDate}</p>
                {c.completedDate && <p className="text-xs text-brand-100/50">Completed: {c.completedDate}</p>}
              </div>
              <div className="text-right">
                {c.userRating && (
                  <p className="text-lg font-bold text-status-maint">{"⭐".repeat(c.userRating)}</p>
                )}
                <p className="text-xs text-brand-100/40">{c.polesInspected} poles · {c.issuesFound} issues</p>
              </div>
            </div>
            {c.userComments && (
              <div className="rounded bg-brand-500/5 p-2 text-xs text-brand-100/70">👤 {c.userComments}</div>
            )}
            {c.ksebNotes && (
              <div className="rounded bg-status-normal/10 p-2 text-xs text-status-normal">🔧 KSEB: {c.ksebNotes}</div>
            )}
          </div>
        ))}
      </div>

      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4">
          <div className="card w-full max-w-md space-y-4 p-6">
            <h2 className="text-lg font-semibold">Submit User Feedback</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-brand-100/60">Pincode</label>
                <select value={newFeedback.pincode} onChange={(e) => setNewFeedback((p) => ({ ...p, pincode: e.target.value }))} className="mt-1 w-full rounded border border-brand-500/20 bg-ink-950/60 px-2 py-1.5 text-sm">
                  <option value="">Select pincode...</option>
                  {checkups.filter((c) => c.status === "COMPLETED").map((c) => (
                    <option key={c.pincode} value={c.pincode}>{c.pincode} - {c.locality}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-brand-100/60">Rating</label>
                <div className="mt-1 flex gap-1">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button key={r} onClick={() => setNewFeedback((p) => ({ ...p, rating: r }))} className={`text-2xl ${r <= newFeedback.rating ? "opacity-100" : "opacity-30"}`}>⭐</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-brand-100/60">Comments</label>
                <textarea value={newFeedback.comments} onChange={(e) => setNewFeedback((p) => ({ ...p, comments: e.target.value }))} placeholder="Share your experience..." className="mt-1 w-full rounded border border-brand-500/20 bg-ink-950/60 px-2 py-1.5 text-sm" rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSubmitModal(false)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={submitFeedback} className="btn-primary text-sm" disabled={!newFeedback.pincode || !newFeedback.comments}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckupStatusBadge({ status }: { status: string }) {
  const cls = status === "COMPLETED" ? "pill-normal" : status === "OVERDUE" ? "pill-fault" : "pill-unknown";
  return <span className={`pill ${cls}`}><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}

function LineConditionBadge({ condition }: { condition: string }) {
  const cls = condition === "GOOD" ? "pill-normal" : condition === "FAIR" ? "pill-maint" : condition === "POOR" ? "pill-fault" : "pill-fault";
  return <span className={`pill ${cls}`}><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />{condition}</span>;
}
