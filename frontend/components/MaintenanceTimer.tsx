"use client";

import { useEffect, useState } from "react";

/** Live countdown with warning + SLA-breach states. Duration is configurable. */
export default function MaintenanceTimer({ deadlineInMin }: { deadlineInMin: number }) {
  const [secondsLeft, setSecondsLeft] = useState(deadlineInMin * 60);

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, []);

  const breached = secondsLeft <= 0;
  const warning = !breached && secondsLeft <= 15 * 60; // within 15 min
  const abs = Math.abs(secondsLeft);
  const mm = String(Math.floor(abs / 60)).padStart(2, "0");
  const ss = String(abs % 60).padStart(2, "0");

  const tone = breached
    ? "text-status-fault animate-pulse-fault"
    : warning
      ? "text-status-maint animate-pulse-maint"
      : "text-status-normal";
  const label = breached ? "SLA BREACHED" : warning ? "WARNING" : "ON TRACK";

  return (
    <div className="flex items-center gap-3">
      <span className={`font-mono text-lg font-bold ${tone}`}>
        {breached ? "-" : ""}
        {mm}:{ss}
      </span>
      <span
        className={`pill ${breached ? "pill-fault" : warning ? "pill-maint" : "pill-normal"}`}
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
        {label}
      </span>
    </div>
  );
}
