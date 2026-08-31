import Link from "next/link";
import ArchitectureFlow from "@/components/ArchitectureFlow";
import LiveMapLoader from "@/components/LiveMapLoader";

function StatusLegend() {
  const items = [
    { cls: "pill-normal", label: "Normal", note: "Electricity available" },
    { cls: "pill-fault", label: "Fault", note: "Outage / line fault" },
    { cls: "pill-maint", label: "Maintenance", note: "Work in progress" },
    { cls: "pill-info", label: "Info", note: "Advisory" },
    { cls: "pill-unknown", label: "Unknown", note: "Stale / no data" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <span key={i.label} className={`pill ${i.cls}`} title={i.note}>
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function NodeTopology() {
  // Demonstrates ordered node topology with an estimated fault between 03 and 04.
  const nodes = [
    { id: "01", ok: true },
    { id: "02", ok: true },
    { id: "03", ok: true },
    { id: "04", ok: false },
    { id: "05", ok: false },
  ];
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {nodes.map((n, idx) => (
        <div key={n.id} className="flex items-center gap-2">
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border font-mono text-sm",
              n.ok
                ? "border-status-normal/40 bg-status-normal/10 text-status-normal"
                : "border-status-fault/50 bg-status-fault/10 text-status-fault animate-pulse-fault",
            ].join(" ")}
            title={n.ok ? "Node healthy" : "Node unavailable"}
          >
            {n.id}
          </div>
          {idx < nodes.length - 1 && (
            <span
              aria-hidden
              className={[
                "h-0.5 w-8 rounded",
                nodes[idx + 1].ok && n.ok ? "bg-brand-500/60" : "bg-status-fault/60",
              ].join(" ")}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Top bar */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500 text-ink-950 shadow-glow">
            <span className="font-mono text-lg font-bold">⚡</span>
          </div>
          <div>
            <p className="font-semibold tracking-tight">
              LT-<span className="text-brand-400">FaultX</span>
            </p>
            <p className="text-xs text-brand-100/50">Smart LT Line Fault Platform</p>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/simulator" className="btn-ghost text-sm">
            Fault Simulator
          </Link>
          <Link href="/user/check-status" className="btn-ghost text-sm">
            Check Power
          </Link>
          <Link href="/login" className="btn-primary text-sm">
            Sign in
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mt-16 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="pill pill-normal mb-4">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            Live monitoring
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Detect. Localize. Isolate.
            <span className="block text-brand-400">Restore with confidence.</span>
          </h1>
          <p className="mt-5 max-w-lg text-brand-100/60">
            A distributed platform for low-tension electrical lines — real-time node
            telemetry, intelligent fault localization, automatic isolation and public
            outage transparency across Kerala.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary">
              Open control center
            </Link>
            <Link href="/user/map" className="btn-ghost">
              View public live map
            </Link>
          </div>
          <div className="mt-8">
            <p className="mb-2 text-xs uppercase tracking-wider text-brand-100/40">
              Status colours never stand alone
            </p>
            <StatusLegend />
          </div>
        </div>

        {/* Right: live-ish topology card */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-100/80">
              LT Line — Segment view
            </p>
            <span className="pill pill-fault animate-pulse-fault">Active fault</span>
          </div>
          <NodeTopology />
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="card p-3">
              <p className="text-xs text-brand-100/50">Estimated segment</p>
              <p className="mt-1 font-mono text-brand-400">NODE_03 → NODE_04</p>
            </div>
            <div className="card p-3">
              <p className="text-xs text-brand-100/50">Last healthy node</p>
              <p className="mt-1 font-mono text-status-normal">NODE_03</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-brand-100/40">
            Demo / simulated data. Estimated segment only — not an exact physical distance.
          </p>
        </div>
      </section>

      {/* Role cards */}
      <section className="mt-20 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Citizen",
            desc: "Check power by pincode, report outages, get alerts, give feedback.",
            href: "/user",
          },
          {
            title: "Operator",
            desc: "Monitor nodes & faults, run authorized isolation, manage maintenance.",
            href: "/operator",
          },
          {
            title: "Administrator",
            desc: "Government analytics, configuration, operators, audit logs.",
            href: "/admin/dashboard",
          },
        ].map((r) => (
          <Link
            key={r.title}
            href={r.href}
            className="card group p-5 transition hover:border-brand-400/40 hover:shadow-glow"
          >
            <p className="font-semibold text-brand-100 group-hover:text-brand-300">
              {r.title}
            </p>
            <p className="mt-2 text-sm text-brand-100/55">{r.desc}</p>
            <span className="mt-4 inline-block text-sm text-brand-400">Enter →</span>
          </Link>
        ))}
      </section>

      <section className="mt-24">
        <div className="mb-8 text-center">
          <span className="pill pill-info mb-3">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            Live network status
          </span>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            The monitored corridor
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-brand-100/55">
            Power availability, active line faults and maintenance for the monitored
            Ernakulam network — one localized view.
          </p>
        </div>

        <div className="grid gap-6">
          <div className="card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-brand-100/90">
                Availability, faults &amp; maintenance
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="pill pill-normal">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                  Current available
                </span>
                <span className="pill pill-fault">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                  Line fault / no current
                </span>
                <span className="pill pill-maint">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                  Maintenance
                </span>
              </div>
            </div>
            <LiveMapLoader role="USER" variant="operations" compact height="26rem" />
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-brand-100/40">
          Simulated demo data · estimated fault segment, not an exact distance · status never shown by colour alone.
        </p>
      </section>

      <ArchitectureFlow />

      <footer className="mt-20 border-t border-brand-500/10 pt-6 text-xs text-brand-100/40">
        LT-FaultX · Hackathon prototype. Not certified for real electrical distribution
        deployment. All field data shown may be simulated.
      </footer>
    </main>
  );
}
