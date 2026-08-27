"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getModeClient, setModeClient, type DataMode } from "@/lib/mode";

/**
 * SIMULATION ↔ LIVE hardware mode switch. Persists to the `ltfx_mode` cookie and
 * refreshes so server components re-read data from the selected source.
 */
export default function ModeToggle() {
  const router = useRouter();
  const [mode, setMode] = useState<DataMode>("simulation");
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setMode(getModeClient());
    setMounted(true);
  }, []);

  function switchTo(next: DataMode) {
    setMode(next);
    setModeClient(next);
    startTransition(() => router.refresh());
  }

  if (!mounted) return null;

  const live = mode === "live";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-brand-100/50">Data source</span>
      <button
        onClick={() => switchTo(live ? "simulation" : "live")}
        className={[
          "rounded-full border px-3 py-1 font-mono transition",
          live
            ? "border-status-fault/50 bg-status-fault/10 text-status-fault"
            : "border-brand-400/50 bg-brand-500/10 text-brand-300",
        ].join(" ")}
        title="Toggle between simulated data and live hardware (Supabase + FastAPI)"
      >
        {live ? "● LIVE HARDWARE" : "● SIMULATION"}
      </button>
    </div>
  );
}
