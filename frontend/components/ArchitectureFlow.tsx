import type { ReactNode } from "react";

/** A single node in the flow diagram. */
function Node({
  title,
  sub,
  tone = "default",
}: {
  title: string;
  sub?: string;
  tone?: "default" | "brand" | "fault" | "info" | "maint";
}) {
  const toneCls = {
    default: "border-brand-500/25 bg-ink-800/70 text-brand-100",
    brand: "border-brand-400/60 bg-brand-500/15 text-brand-200 shadow-glow",
    fault: "border-status-fault/50 bg-status-fault/10 text-status-fault",
    info: "border-status-info/50 bg-status-info/10 text-status-info",
    maint: "border-status-maint/50 bg-status-maint/10 text-status-maint",
  }[tone];
  return (
    <div
      className={`inline-flex min-w-[9rem] flex-col items-center rounded-lg border px-4 py-3 text-center ${toneCls}`}
    >
      <span className="font-mono text-sm font-semibold tracking-wide">{title}</span>
      {sub && <span className="mt-0.5 text-[11px] text-brand-100/50">{sub}</span>}
    </div>
  );
}

/** Vertical connector with a downward chevron. */
function Down() {
  return (
    <div className="flex flex-col items-center" aria-hidden>
      <span className="h-6 w-px bg-brand-500/40" />
      <span className="-mt-1 text-brand-500/60">▼</span>
    </div>
  );
}

/** Fan-out connector: one parent line branching to N children. */
function Branch({ count, children }: { count: number; children: ReactNode }) {
  const inset = `${50 / count}%`;
  return (
    <div className="w-full">
      {/* parent stub */}
      <div className="flex justify-center" aria-hidden>
        <span className="h-6 w-px bg-brand-500/40" />
      </div>
      {/* horizontal bar spanning child centers */}
      <div className="relative h-6" aria-hidden>
        <span
          className="absolute top-0 h-px bg-brand-500/40"
          style={{ left: inset, right: inset }}
        />
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: count }).map((_, i) => (
            <span key={i} className="mx-auto h-6 w-px bg-brand-500/40" />
          ))}
        </div>
      </div>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      >
        {children}
      </div>
    </div>
  );
}

export default function ArchitectureFlow() {
  return (
    <section className="mt-24">
      <div className="mb-8 text-center">
        <span className="pill pill-info mb-3">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          How it works
        </span>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Detect → Localize → Alert
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-brand-100/55">
          From distributed field telemetry to the live Kerala map and automated response.
        </p>
      </div>

      <div className="card mx-auto max-w-3xl p-6 sm:p-10">
        <div className="flex flex-col items-center">
          <Node title="LT-FaultX" tone="brand" />

          {/* Two data inputs */}
          <Branch count={2}>
            <div className="flex justify-center">
              <Node title="ELECTRICAL DATA" sub="Current / Voltage" />
            </div>
            <div className="flex justify-center">
              <Node title="LOCATION DATA" sub="GPS / PIN" />
            </div>
          </Branch>

          {/* Merge back to spine */}
          <Down />
          <Node title="FAULT ENGINE" sub="Multi-signal classification" />
          <Down />
          <Node title="FAULT LOCATION" sub="Estimated segment" />
          <Down />
          <Node title="KERALA LIVE MAP" tone="info" sub="Leaflet + OpenStreetMap" />

          {/* Three consumer roles */}
          <Branch count={3}>
            <div className="flex flex-col items-center gap-3">
              <Node title="USER" />
              <span className="h-4 w-px bg-brand-500/40" aria-hidden />
              <Node title="ALERT" tone="maint" />
            </div>
            <div className="flex flex-col items-center gap-3">
              <Node title="OPERATOR" />
              <span className="h-4 w-px bg-brand-500/40" aria-hidden />
              <Node title="DISPATCH" />
            </div>
            <div className="flex flex-col items-center gap-3">
              <Node title="GOVERNMENT" />
              <span className="h-4 w-px bg-brand-500/40" aria-hidden />
              <Node title="ANALYTICS" tone="info" />
            </div>
          </Branch>

          <Down />
          <Node title="SMS + CALL" tone="fault" sub="Automated notification" />
        </div>
      </div>
    </section>
  );
}
