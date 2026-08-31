"use client";

import { useState } from "react";
import SimulatorStatusCard from "@/components/SimulatorStatusCard";

interface Result {
  pincode: string;
  location: string;
  district: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "PARTIAL" | "MAINTENANCE" | "UNKNOWN";
  lastUpdated: string;
  activeFault: boolean;
  maintenance: boolean;
  estRestoration: string | null;
  lat: number;
  lng: number;
  monitored: boolean;
}

const STATUS_STYLE: Record<Result["status"], { pill: string; text: string }> = {
  AVAILABLE: { pill: "pill-normal", text: "Electricity available" },
  UNAVAILABLE: { pill: "pill-fault", text: "Electricity unavailable" },
  PARTIAL: { pill: "pill-maint", text: "Partial supply" },
  MAINTENANCE: { pill: "pill-maint", text: "Maintenance in progress" },
  UNKNOWN: { pill: "pill-unknown", text: "Status unknown / stale data" },
};

export default function CheckStatusPage() {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const p = pincode.trim();
    if (!/^\d{6}$/.test(p)) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/location/pin/${p}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Lookup failed.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Check Power</h1>
        <p className="mt-1 text-sm text-brand-100/50">
          Enter any Kerala pincode to see the current electricity status.
        </p>
      </div>

      <form onSubmit={lookup} className="flex gap-2">
        <input
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          inputMode="numeric"
          placeholder="e.g. 670632"
          className="flex-1 rounded-lg border border-brand-500/20 bg-ink-950/60 px-3 py-2 text-brand-50 placeholder:text-brand-100/30 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Checking…" : "Check"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-status-fault/40 bg-status-fault/10 px-3 py-2 text-sm text-status-fault">
          {error}
        </p>
      )}

      {result && (
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{result.location}</p>
              <p className="font-mono text-sm text-brand-100/50">
                {result.district} · Pincode {result.pincode}
              </p>
            </div>
            <span className={`pill ${STATUS_STYLE[result.status].pill}`}>
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
              {STATUS_STYLE[result.status].text}
            </span>
          </div>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-brand-100/40">Last updated</p>
              <p>{result.lastUpdated}</p>
            </div>
            <div>
              <p className="text-xs text-brand-100/40">Active fault</p>
              <p>{result.activeFault ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-xs text-brand-100/40">Maintenance</p>
              <p>{result.maintenance ? "In progress" : "None"}</p>
            </div>
            <div>
              <p className="text-xs text-brand-100/40">Estimated restoration</p>
              <p>{result.estRestoration ?? "—"}</p>
            </div>
          </div>

          {result.estRestoration && (
            <p className="mt-4 rounded-lg border border-status-info/30 bg-status-info/5 px-3 py-2 text-xs text-status-info">
              Note: the restoration time is an estimate and may change.
            </p>
          )}
          {!result.monitored && (
            <p className="mt-4 text-xs text-brand-100/40">
              This locality is outside the current monitoring network (demo), so live
              electricity status is not available. Location resolved from pincode data.
            </p>
          )}
        </div>
      )}

      <section aria-label="Prototype simulator status" className="space-y-2">
        <h2 className="text-sm font-semibold text-brand-100/60">
          Prototype — simulated node
        </h2>
        <SimulatorStatusCard audience="citizen" />
      </section>

      <p className="text-xs text-brand-100/40">
        Any valid Kerala pincode resolves its locality. Monitored demo areas with live
        status: 670632 (Chelimparambu, Chemberi), 670631 (Chempanthotty), 670650 (Kolayad).
      </p>
    </div>
  );
}
