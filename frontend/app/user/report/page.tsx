"use client";

import { useState } from "react";

export default function ReportOutagePage() {
  const [submitted, setSubmitted] = useState(false);
  const [electricity, setElectricity] = useState<"YES" | "NO" | "PARTIAL">("NO");
  const [pincode, setPincode] = useState("");
  const [locality, setLocality] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState<boolean>(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(pincode.trim())) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/outage-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode: pincode.trim(), locality: locality.trim(), electricity, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit report.");
        return;
      }
      setPlaced(data.report?.lat != null);
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSubmitted(false);
    setPincode("");
    setLocality("");
    setDescription("");
    setElectricity("NO");
    setError(null);
  }

  if (submitted) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="card p-6">
          <span className="pill pill-normal">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            Report received
          </span>
          <h1 className="mt-3 text-xl font-semibold">Thank you</h1>
          <p className="mt-1 text-sm text-brand-100/60">
            Your report has been recorded and cross-checked with live telemetry and operator
            data.{" "}
            {placed
              ? "It now appears on the live map as a user-reported issue."
              : "We couldn't place it on the map (pincode not found in the Kerala dataset), but it was still logged."}
          </p>
          <div className="mt-4 flex gap-2">
            <a href="/user" className="btn-primary text-sm">View on map</a>
            <button className="btn-ghost text-sm" onClick={reset}>
              Submit another report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Report Outage</h1>
        <p className="mt-1 text-sm text-brand-100/50">
          Tell us about an electricity problem in your area.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-brand-100/70">Pincode</label>
            <input
              required
              inputMode="numeric"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="682020"
              className="w-full rounded-lg border border-brand-500/20 bg-ink-950/60 px-3 py-2 text-brand-50 placeholder:text-brand-100/30 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-brand-100/70">Locality</label>
            <input
              required
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder="Kadavanthra"
              className="w-full rounded-lg border border-brand-500/20 bg-ink-950/60 px-3 py-2 text-brand-50 placeholder:text-brand-100/30 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm text-brand-100/70">Electricity available?</span>
          <div className="flex flex-wrap gap-2">
            {(["YES", "NO", "PARTIAL"] as const).map((opt) => (
              <button
                type="button"
                key={opt}
                onClick={() => setElectricity(opt)}
                className={[
                  "rounded-lg border px-4 py-2 text-sm transition",
                  electricity === opt
                    ? "border-brand-400 bg-brand-500/15 text-brand-200"
                    : "border-brand-500/20 text-brand-100/60 hover:border-brand-400/50",
                ].join(" ")}
              >
                {opt === "YES" ? "Available" : opt === "NO" ? "Not available" : "Partial"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-brand-100/70">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Power has been unavailable for approximately 20 minutes."
            className="w-full rounded-lg border border-brand-500/20 bg-ink-950/60 px-3 py-2 text-brand-50 placeholder:text-brand-100/30 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-status-fault/40 bg-status-fault/10 px-3 py-2 text-sm text-status-fault">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Submitting…" : "Submit report"}
        </button>
        <p className="text-xs text-brand-100/40">
          Your report is user-reported data and is cross-checked with system telemetry.
        </p>
      </form>
    </div>
  );
}
