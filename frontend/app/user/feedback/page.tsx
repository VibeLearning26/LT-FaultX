"use client";

import { useState } from "react";

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl transition ${n <= value ? "text-status-maint" : "text-brand-100/25"}`}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [tab, setTab] = useState<"maintenance" | "monthly">("maintenance");
  const [rating, setRating] = useState(4);
  const [restored, setRestored] = useState<"YES" | "NO">("YES");
  const [done, setDone] = useState(false);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Feedback</h1>
        <p className="mt-1 text-sm text-brand-100/50">
          Help improve service quality. Your feedback feeds government analytics.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setTab("maintenance"); setDone(false); }}
          className={tab === "maintenance" ? "btn-primary text-sm" : "btn-ghost text-sm"}
        >
          Maintenance feedback
        </button>
        <button
          onClick={() => { setTab("monthly"); setDone(false); }}
          className={tab === "monthly" ? "btn-primary text-sm" : "btn-ghost text-sm"}
        >
          Monthly service
        </button>
      </div>

      {done ? (
        <div className="card p-6">
          <span className="pill pill-normal">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            Submitted
          </span>
          <p className="mt-3 text-sm text-brand-100/60">Thanks for your feedback.</p>
          <button className="btn-ghost mt-4" onClick={() => setDone(false)}>
            Give more feedback
          </button>
        </div>
      ) : tab === "maintenance" ? (
        <form onSubmit={(e) => { e.preventDefault(); setDone(true); }} className="card space-y-5 p-6">
          <div>
            <span className="mb-2 block text-sm text-brand-100/70">Was electricity restored?</span>
            <div className="flex gap-2">
              {(["YES", "NO"] as const).map((o) => (
                <button
                  type="button"
                  key={o}
                  onClick={() => setRestored(o)}
                  className={[
                    "rounded-lg border px-4 py-2 text-sm",
                    restored === o
                      ? "border-brand-400 bg-brand-500/15 text-brand-200"
                      : "border-brand-500/20 text-brand-100/60",
                  ].join(" ")}
                >
                  {o === "YES" ? "Yes, restored" : "No, still out"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-2 block text-sm text-brand-100/70">Rate the maintenance</span>
            <Stars value={rating} onChange={setRating} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-brand-100/70">Comments</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-brand-500/20 bg-ink-950/60 px-3 py-2 text-brand-50 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <button type="submit" className="btn-primary w-full">Submit feedback</button>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setDone(true); }} className="card space-y-5 p-6">
          {["Reliability", "Restoration speed", "Maintenance quality", "Communication", "Overall service"].map(
            (metric) => (
              <div key={metric} className="flex items-center justify-between">
                <span className="text-sm text-brand-100/70">{metric}</span>
                <Stars value={rating} onChange={setRating} />
              </div>
            ),
          )}
          <button type="submit" className="btn-primary w-full">Submit monthly feedback</button>
        </form>
      )}
    </div>
  );
}
