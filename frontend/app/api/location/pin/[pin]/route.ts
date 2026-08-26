import { NextResponse } from "next/server";
import { MONITORED_PINCODES, type PincodeStatus } from "@/lib/demo-data";
import keralaPins from "@/lib/server/kerala-pins.json";

type PinRecord = { pin: string; office: string; district: string; lat: number; lng: number };
const DATASET = keralaPins as Record<string, PinRecord>;

interface IndiaPostOffice {
  Name: string;
  BranchType: string;
  District: string;
  Block: string;
  State: string;
}

/** Rank so the primary office (Head > Sub > Branch) is chosen as the display name. */
function officeRank(branchType: string): number {
  const t = branchType.toLowerCase();
  if (t.includes("head")) return 0;
  if (t.includes("sub")) return 1;
  return 2;
}

/**
 * Query the official India Post API for the authoritative primary office name
 * + district. Cached for a day. Returns null on any failure so we can fall back.
 */
async function resolveFromIndiaPost(
  pin: string,
): Promise<{ office: string; district: string; state: string } | null> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : null;
    if (!entry || entry.Status !== "Success" || !Array.isArray(entry.PostOffice)) return null;
    const offices = entry.PostOffice as IndiaPostOffice[];
    if (offices.length === 0) return null;
    const primary = [...offices].sort((a, b) => officeRank(a.BranchType) - officeRank(b.BranchType))[0];
    return {
      office: primary.Name,
      district: primary.District,
      state: primary.State,
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/location/pin/[pin]
 * Monitored pincodes return real (simulated) live status. Any other valid Kerala
 * pincode resolves its primary locality via India Post (authoritative), with
 * coordinates from the GeoNames dataset, and reports UNKNOWN power status.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pin: string }> },
) {
  const { pin } = await params;
  const p = (pin ?? "").trim();

  if (!/^\d{6}$/.test(p)) {
    return NextResponse.json({ error: "Enter a valid 6-digit pincode." }, { status: 400 });
  }

  const monitored = MONITORED_PINCODES[p];
  if (monitored) {
    return NextResponse.json({ ...monitored } satisfies PincodeStatus);
  }

  const geo = DATASET[p]; // coordinates (may be undefined)
  const official = await resolveFromIndiaPost(p);

  // Reject non-Kerala pincodes (India Post says another state, or not in Kerala dataset).
  if (official && official.state && official.state.toLowerCase() !== "kerala" && !geo) {
    return NextResponse.json(
      { error: "This demo covers Kerala pincodes only." },
      { status: 404 },
    );
  }
  if (!official && !geo) {
    return NextResponse.json(
      { error: "Pincode not found in Kerala. This demo covers Kerala pincodes only." },
      { status: 404 },
    );
  }

  const result: PincodeStatus = {
    pincode: p,
    location: official?.office ?? geo?.office ?? "Unknown locality",
    district: official?.district ?? geo?.district ?? "",
    status: "UNKNOWN",
    lastUpdated: "—",
    activeFault: false,
    maintenance: false,
    estRestoration: null,
    lat: geo?.lat ?? 0,
    lng: geo?.lng ?? 0,
    monitored: false,
  };
  return NextResponse.json(result);
}
