"use client";

import dynamic from "next/dynamic";
import type { MapRole, MapVariant } from "./LiveMap";

/** Client-only loader — Leaflet needs `window`, so SSR is disabled. */
const LiveMap = dynamic(() => import("./LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[22rem] place-items-center rounded-xl border border-brand-500/20 bg-ink-900/60 text-sm text-brand-100/50">
      Loading live map…
    </div>
  ),
});

export default function LiveMapLoader({
  role,
  variant,
  compact,
  height,
}: {
  role?: MapRole;
  variant?: MapVariant;
  compact?: boolean;
  height?: string;
}) {
  return <LiveMap role={role} variant={variant} compact={compact} height={height} />;
}
