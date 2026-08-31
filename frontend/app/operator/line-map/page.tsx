"use client";

import { useState, useEffect, useCallback } from "react";
import { useHardware } from "@/lib/hardware-context";

interface WireSegment {
  id: string;
  label: string;
  broken: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const INITIAL_WIRES: WireSegment[] = [
  { id: "wire-a",  label: "Phase A", broken: false, x1: 120, y1: 140, x2: 480, y2: 140 },
  { id: "wire-b",  label: "Phase B", broken: false, x1: 120, y1: 180, x2: 480, y2: 180 },
  { id: "wire-c",  label: "Phase C", broken: false, x1: 120, y1: 220, x2: 480, y2: 220 },
  { id: "wire-n",  label: "Neutral", broken: false, x1: 120, y1: 280, x2: 480, y2: 280 },
];

export default function LineMapPage() {
  const { telemetryByDevice } = useHardware();
  const [wires, setWires] = useState<WireSegment[]>(INITIAL_WIRES);
  const [selectedWire, setSelectedWire] = useState<string | null>(null);

  const totalBroken = wires.filter((w) => w.broken).length;
  const allHealthy = totalBroken === 0;

  // Sync hardware context to wire states
  useEffect(() => {
    const hw = telemetryByDevice["ESP32-POLE-01"];
    if (hw) {
      const fault = hw.fault || hw.line_status === "FAULT";
      setWires((prev) =>
        prev.map((w) => ({ ...w, broken: fault }))
      );
    }
  }, [telemetryByDevice]);

  const toggleWire = useCallback((id: string) => {
    setWires((prev) => {
      const next = prev.map((w) => (w.id === id ? { ...w, broken: !w.broken } : w));
      const changed = next.find((w) => w.id === id);
      if (changed) {
        // Send to backend
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/line-map/fault`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_id: "ESP32-POLE-01",
            fault: changed.broken,
            wire_id: changed.id,
            wire_label: changed.label,
            voltage_post_2: changed.broken ? 0.1 : 12.0,
            current: changed.broken ? 0.0 : 0.42,
          }),
        }).catch(() => {});
      }
      return next;
    });
    setSelectedWire(id);
  }, []);

  const resetAll = useCallback(() => {
    setWires((prev) => prev.map((w) => ({ ...w, broken: false })));
    setSelectedWire(null);
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/line-map/fault`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: "ESP32-POLE-01", fault: false, wire_label: "All" }),
    }).catch(() => {});
  }, []);

  const breakAll = useCallback(() => {
    setWires((prev) => prev.map((w) => ({ ...w, broken: true })));
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/line-map/fault`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: "ESP32-POLE-01", fault: true, wire_label: "All" }),
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">LT Line Map</h1>
          <p className="text-sm text-brand-100/50">
            Click any wire to simulate a line break. Fault data transmits to FaultX in real time.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={breakAll} className="btn-secondary text-sm">Break All</button>
          <button onClick={resetAll} className="btn-primary text-sm">Reset All</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Total Wires</p>
          <p className="mt-1 text-2xl font-bold">{wires.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Broken</p>
          <p className="mt-1 text-2xl font-bold text-status-fault">{totalBroken}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-brand-100/40">Status</p>
          <p className={`mt-1 text-2xl font-bold ${allHealthy ? "text-status-normal" : "text-status-fault"}`}>
            {allHealthy ? "HEALTHY" : "FAULT"}
          </p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="border-b border-brand-500/10 px-5 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">Pole 01 → Pole 02</span>
          <span className={`pill ${allHealthy ? "pill-normal" : "pill-fault"}`}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            {allHealthy ? "All Lines Healthy" : `${totalBroken} Line${totalBroken > 1 ? "s" : ""} Broken`}
          </span>
        </div>
        <div className="relative">
          <svg viewBox="0 0 600 350" className="w-full h-auto" style={{ minHeight: 300 }}>
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0a1628" />
                <stop offset="100%" stopColor="#162032" />
              </linearGradient>
              <filter id="glow-red">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-green">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <rect width="600" height="350" fill="url(#sky)" />
            <rect x="0" y="310" width="600" height="40" fill="#1a2a1a" />
            <circle cx="50" cy="320" r="3" fill="#2a3a2a" />
            <circle cx="150" cy="325" r="2" fill="#2a3a2a" />
            <circle cx="300" cy="318" r="3" fill="#2a3a2a" />
            <circle cx="450" cy="322" r="2" fill="#2a3a2a" />
            <circle cx="550" cy="320" r="3" fill="#2a3a2a" />

            <rect x="105" y="100" width="6" height="220" fill="#4a3a2a" rx="2" />
            <rect x="95" y="130" width="26" height="4" fill="#3a2a1a" rx="1" />
            <rect x="95" y="170" width="26" height="4" fill="#3a2a1a" rx="1" />
            <rect x="95" y="210" width="26" height="4" fill="#3a2a1a" rx="1" />
            <rect x="95" y="270" width="26" height="4" fill="#3a2a1a" rx="1" />
            <text x="108" y="95" fill="#5a6a7a" fontSize="11" textAnchor="middle">Pole 01</text>

            <rect x="489" y="100" width="6" height="220" fill="#4a3a2a" rx="2" />
            <rect x="479" y="130" width="26" height="4" fill="#3a2a1a" rx="1" />
            <rect x="479" y="170" width="26" height="4" fill="#3a2a1a" rx="1" />
            <rect x="479" y="210" width="26" height="4" fill="#3a2a1a" rx="1" />
            <rect x="479" y="270" width="26" height="4" fill="#3a2a1a" rx="1" />
            <text x="492" y="95" fill="#5a6a7a" fontSize="11" textAnchor="middle">Pole 02</text>

            {wires.map((wire) => {
              const midX = (wire.x1 + wire.x2) / 2;
              const midY = (wire.y1 + wire.y2) / 2;
              return (
                <g key={wire.id} onClick={() => toggleWire(wire.id)} className="cursor-pointer">
                  {wire.broken ? (
                    <>
                      <line x1={wire.x1} y1={wire.y1} x2={midX - 20} y2={midY - 5}
                        stroke="#ef4444" strokeWidth="3" strokeLinecap="round" filter="url(#glow-red)" />
                      <line x1={midX + 20} y1={midY + 5} x2={wire.x2} y2={wire.y2}
                        stroke="#ef4444" strokeWidth="3" strokeLinecap="round" filter="url(#glow-red)" />
                      <line x1={midX - 20} y1={midY - 5} x2={midX - 5} y2={midY + 15}
                        stroke="#ef4444" strokeWidth="3" strokeLinecap="round" filter="url(#glow-red)">
                        <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
                      </line>
                      <circle cx={midX} cy={midY + 12} r="6" fill="#ef4444" filter="url(#glow-red)">
                        <animate attributeName="r" values="6;9;6" dur="1.2s" repeatCount="indefinite" />
                      </circle>
                      <text x={midX} y={midY + 30} fill="#ef4444" fontSize="10" textAnchor="middle">ARC</text>
                    </>
                  ) : (
                    <>
                      <line x1={wire.x1} y1={wire.y1} x2={wire.x2} y2={wire.y2}
                        stroke="#22c55e" strokeWidth="3" strokeLinecap="round" filter="url(#glow-green)">
                        <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite" />
                      </line>
                    </>
                  )}

                  <rect
                    x={midX - 40} y={midY - 14} width="80" height="28" rx="4"
                    fill={selectedWire === wire.id ? "rgba(59,130,246,0.3)" : "transparent"}
                    stroke={selectedWire === wire.id ? "#3b82f6" : "transparent"}
                  />
                  <text x={midX} y={midY + 4}
                    fill={wire.broken ? "#ef4444" : "#22c55e"}
                    fontSize="10" textAnchor="middle" fontWeight="bold"
                  >
                    {wire.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-medium mb-3">Wire Status</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {wires.map((w) => (
            <button
              key={w.id}
              onClick={() => toggleWire(w.id)}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                w.broken
                  ? "border-status-fault/40 bg-status-fault/10 text-status-fault"
                  : "border-status-normal/40 bg-status-normal/10 text-status-normal"
              }`}
            >
              <span className="font-medium">{w.label}</span>
              <span className={`pill ${w.broken ? "pill-fault" : "pill-normal"}`}>
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                {w.broken ? "BROKEN" : "OK"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
