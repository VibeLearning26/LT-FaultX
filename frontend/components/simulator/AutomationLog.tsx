"use client";

import type { SimulatorLogEntry } from "@/lib/simulator-client";

/**
 * AutomationLog — newest-first, timestamped record of the pipeline stages the
 * simulated fault actually traversed.
 */

const STAGE_STYLE: Record<string, { cls: string; label: string }> = {
  DETECTION: { cls: "pill-fault", label: "DETECTION" },
  PROCESSING: { cls: "pill-info", label: "PROCESSING" },
  AUTOMATION: { cls: "pill-maint", label: "AUTOMATION" },
  NOTIFICATION: { cls: "pill-info", label: "NOTIFICATION" },
  RECOVERY: { cls: "pill-normal", label: "RECOVERY" },
};

export default function AutomationLog({
  log,
  onClear,
}: {
  log: SimulatorLogEntry[];
  onClear?: () => void;
}) {
  return (
    <div className="card flex max-h-[30rem] flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-100/85">Automation Event Log</h3>
        <span className="text-xs text-brand-100/40">{log.length} events</span>
      </div>

      <div className="-mr-2 flex-1 overflow-y-auto pr-2">
        {log.length === 0 ? (
          <p className="text-sm text-brand-100/40">
            No events yet. Hover the conductor or click the fuse to inject a fault.
          </p>
        ) : (
          <ol className="space-y-2">
            {log.map((e, i) => {
              const s = STAGE_STYLE[e.stage] ?? { cls: "pill-unknown", label: e.stage };
              return (
                <li
                  key={`${e.at}-${i}`}
                  className="rounded-lg border border-brand-500/10 bg-ink-900/40 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`pill ${s.cls} shrink-0`}>
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                      {s.label}
                    </span>
                    <time className="font-mono text-[11px] text-brand-100/40">
                      {new Date(e.at).toLocaleTimeString()}
                    </time>
                  </div>
                  <p className="mt-1.5 text-sm text-brand-100/80">{e.message}</p>
                  {e.detail && (
                    <p className="mt-0.5 font-mono text-[11px] text-brand-100/40">
                      {e.detail}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {onClear && log.length > 0 && (
        <button onClick={onClear} className="btn-ghost mt-3 self-start text-xs">
          Clear view
        </button>
      )}
    </div>
  );
}
