import Link from "next/link";
import Simulator from "@/components/simulator/Simulator";
import { PageHeader } from "@/components/ui";

export const metadata = {
  title: "Fault Simulator · LT-FaultX",
  description:
    "Software-only electrical fault simulator that exercises the FaultX detection, notification, map and escalation pipeline.",
};

export default function SimulatorPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 text-ink-950 shadow-glow">
            <span className="font-mono text-base font-bold">⚡</span>
          </div>
          <div>
            <p className="font-semibold tracking-tight">
              LT-<span className="text-brand-400">FaultX</span>
            </p>
            <p className="text-xs text-brand-100/50">Test environment</p>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/operator" className="btn-ghost text-sm">
            Operator console
          </Link>
          <Link href="/" className="btn-ghost text-sm">
            Home
          </Link>
        </nav>
      </div>

      <div className="mb-6 rounded-xl border border-status-maint/30 bg-status-maint/5 px-4 py-3">
        <p className="text-sm text-status-maint">
          <span className="font-semibold">Test environment — not the production dashboard.</span>{" "}
          Faults raised here are real software events tagged{" "}
          <span className="font-mono">source=SIMULATOR</span> and travel the same backend
          pipeline as hardware faults. No physical output is ever driven.
        </p>
      </div>

      <PageHeader
        title="Electrical Fault Simulator"
        subtitle="Inject an LT line break or fuse failure, then watch detection, operator notification, map update, emergency escalation and recovery run end to end."
      />

      <div className="mt-6">
        <Simulator />
      </div>
    </main>
  );
}
