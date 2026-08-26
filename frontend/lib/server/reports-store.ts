import keralaPins from "./kerala-pins.json";
import { MONITORED_PINCODES } from "@/lib/demo-data";

export interface OutageReport {
  id: string;
  pincode: string;
  locality: string;
  electricity: "YES" | "NO" | "PARTIAL";
  description: string;
  lat: number | null;
  lng: number | null;
  district: string | null;
  createdAt: string; // ISO
}

type PinRecord = { pin: string; office: string; district: string; lat: number; lng: number };
const DATASET = keralaPins as Record<string, PinRecord>;

/**
 * In-memory citizen-report store. Persisted on globalThis so it survives Next.js
 * dev hot-reloads. Replaced by the FastAPI backend + database in a later phase.
 */
const store: OutageReport[] =
  (globalThis as unknown as { __ltfxReports?: OutageReport[] }).__ltfxReports ??
  ((globalThis as unknown as { __ltfxReports?: OutageReport[] }).__ltfxReports = []);

/** Resolve coordinates + district for a pincode (monitored first, then dataset). */
export function resolvePin(pincode: string): { lat: number | null; lng: number | null; district: string | null } {
  const mon = MONITORED_PINCODES[pincode];
  if (mon) return { lat: mon.lat, lng: mon.lng, district: mon.district };
  const rec = DATASET[pincode];
  if (rec) return { lat: rec.lat, lng: rec.lng, district: rec.district };
  return { lat: null, lng: null, district: null };
}

export function addReport(input: {
  pincode: string;
  locality: string;
  electricity: "YES" | "NO" | "PARTIAL";
  description: string;
}): OutageReport {
  const geo = resolvePin(input.pincode);
  const report: OutageReport = {
    id: `CR-${Date.now().toString(36).toUpperCase()}`,
    pincode: input.pincode,
    locality: input.locality,
    electricity: input.electricity,
    description: input.description,
    lat: geo.lat,
    lng: geo.lng,
    district: geo.district,
    createdAt: new Date().toISOString(),
  };
  store.unshift(report);
  return report;
}

export function listReports(): OutageReport[] {
  return store;
}
