import Link from "next/link";
import type { ReactNode } from "react";

/** Small "simulated data" marker used across pages per the data-labelling rule. */
export function SimBadge({ label = "Simulated" }: { label?: string }) {
  return (
    <span className="pill pill-info">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-brand-100/50">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export type StatusKind = "normal" | "fault" | "maint" | "info" | "unknown";

const LABELS: Record<StatusKind, string> = {
  normal: "Normal",
  fault: "Fault",
  maint: "Maintenance",
  info: "Info",
  unknown: "Unknown",
};

export function StatusPill({
  kind,
  label,
  pulse,
}: {
  kind: StatusKind;
  label?: string;
  pulse?: boolean;
}) {
  const anim = pulse && kind === "fault" ? "animate-pulse-fault" : pulse && kind === "maint" ? "animate-pulse-maint" : "";
  return (
    <span className={`pill pill-${kind} ${anim}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? LABELS[kind]}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

/** Placeholder for a not-yet-wired feature, so nav never dead-ends. */
export function PhaseNote({ phase, children }: { phase: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-status-info/30 bg-status-info/5 p-4 text-sm text-brand-100/60">
      <span className="font-semibold text-status-info">{phase}:</span> {children}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm text-brand-400 hover:text-brand-300">
      {children}
    </Link>
  );
}
