import { NextResponse } from "next/server";
import keralaPins from "@/lib/server/kerala-pins.json";
import { MONITORED_PINCODES } from "@/lib/demo-data";
import { listReports } from "@/lib/server/reports-store";

type PinRecord = { pin: string; office: string; district: string; lat: number; lng: number };
const DATASET = Object.values(keralaPins as Record<string, PinRecord>);

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * GET /api/map/points
 * Returns a live snapshot for the heat-style map:
 *  - points: [lat, lng, status] for every Kerala pincode (status: "a" avail | "o" outage)
 *  - feed:   most recent status events (citizen reports first, then sampled localities)
 *
 * Outage selection is stable (hashed by pincode) so dots don't flicker between polls,
 * plus any monitored-unavailable pincodes and citizen "NO" reports.
 */
export async function GET() {
  const reportedOutage = new Set(
    listReports().filter((r) => r.electricity === "NO").map((r) => r.pincode),
  );
  const monitoredOutage = new Set(
    Object.values(MONITORED_PINCODES)
      .filter((m) => m.status === "UNAVAILABLE")
      .map((m) => m.pincode),
  );

  const points: [number, number, "a" | "o"][] = DATASET.map((d) => {
    const outage = reportedOutage.has(d.pin) || monitoredOutage.has(d.pin) || hash(d.pin) % 41 === 0;
    return [d.lat, d.lng, outage ? "o" : "a"];
  });

  // Feed: citizen reports (newest first), then a few stable sampled localities.
  const now = Date.now();
  const reportFeed = listReports()
    .slice(0, 6)
    .map((r) => ({
      status: r.electricity === "NO" ? "OUTAGE" : r.electricity === "PARTIAL" ? "PARTIAL" : "AVAILABLE",
      agoMin: Math.max(1, Math.round((now - new Date(r.createdAt).getTime()) / 60000)),
      pincode: r.pincode,
      office: r.locality,
      district: r.district ?? "",
    }));

  const sampled = DATASET
    .filter((_, i) => i % 137 === 0)
    .slice(0, 8)
    .map((d) => ({
      status: hash(d.pin) % 41 === 0 ? "OUTAGE" : "AVAILABLE",
      agoMin: (hash(d.pin) % 18) + 1,
      pincode: d.pin,
      office: d.office,
      district: d.district,
    }));

  const feed = [...reportFeed, ...sampled].sort((a, b) => a.agoMin - b.agoMin).slice(0, 10);

  const total = points.length;
  const outages = points.filter((p) => p[2] === "o").length;

  return NextResponse.json({ points, feed, stats: { total, outages, available: total - outages } });
}
