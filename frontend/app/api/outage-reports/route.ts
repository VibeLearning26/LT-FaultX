import { NextResponse } from "next/server";
import { addReport, listReports, resolvePin } from "@/lib/server/reports-store";
import { getModeServer } from "@/lib/mode.server";
import { createClient } from "@/lib/supabase/server";

/**
 * Citizen outage reports.
 *
 * SIMULATION mode: uses the in-memory reports store (no backend needed).
 * LIVE mode: reads/writes Supabase `outage_reports` under RLS (citizens create
 * + read their own; operators/admins read all).
 */

/** GET /api/outage-reports — list reports (newest first). */
export async function GET() {
  const mode = await getModeServer();
  if (mode === "simulation") {
    return NextResponse.json({ reports: listReports() });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outage_reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ reports: data ?? [] });
}

/** POST /api/outage-reports — submit a citizen outage report. */
export async function POST(req: Request) {
  let body: {
    pincode?: string;
    locality?: string;
    electricity?: "YES" | "NO" | "PARTIAL";
    description?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const pincode = (body.pincode ?? "").trim();
  const locality = (body.locality ?? "").trim();
  const electricity = body.electricity ?? "NO";
  const description = (body.description ?? "").trim();

  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: "Enter a valid 6-digit pincode." }, { status: 400 });
  }
  if (!locality) {
    return NextResponse.json({ error: "Locality is required." }, { status: 400 });
  }
  if (!["YES", "NO", "PARTIAL"].includes(electricity)) {
    return NextResponse.json({ error: "Invalid electricity value." }, { status: 400 });
  }

  const mode = await getModeServer();
  if (mode === "simulation") {
    const report = addReport({ pincode, locality, electricity, description });
    return NextResponse.json({ ok: true, report }, { status: 201 });
  }

  // LIVE: insert under the signed-in citizen (RLS requires reporter_id = auth.uid()).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in to report." }, { status: 401 });
  }

  const geo = resolvePin(pincode); // reuse existing pincode resolution
  const { data, error } = await supabase
    .from("outage_reports")
    .insert({
      reporter_id: user.id,
      pincode,
      locality,
      electricity,
      description,
      latitude: geo.lat,
      longitude: geo.lng,
      district: geo.district,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Normalize field names so the report page's `report.lat` check still works.
  const report = { ...data, lat: data.latitude, lng: data.longitude };
  return NextResponse.json({ ok: true, report }, { status: 201 });
}
