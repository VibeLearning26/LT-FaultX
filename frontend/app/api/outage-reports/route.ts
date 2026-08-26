import { NextResponse } from "next/server";
import { addReport, listReports } from "@/lib/server/reports-store";

/** GET /api/outage-reports — list citizen outage reports (newest first). */
export async function GET() {
  return NextResponse.json({ reports: listReports() });
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

  const report = addReport({ pincode, locality, electricity, description });
  return NextResponse.json({ ok: true, report }, { status: 201 });
}
