import { NextResponse } from "next/server";
import { applySimulatorEvent } from "@/lib/server/simulator-store";
import type { SimulatorEventName } from "@/lib/simulator-client";

const VALID: SimulatorEventName[] = ["LINE_BREAK", "FUSE_FAILURE", "PERSON_CONTACT", "RESET"];

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { event?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const event = body.event as SimulatorEventName | undefined;
  if (!event || !VALID.includes(event)) {
    return NextResponse.json(
      { error: `Unknown simulator event. Expected one of: ${VALID.join(", ")}.` },
      { status: 400 }
    );
  }

  const simulator = applySimulatorEvent(event, body.note);
  return NextResponse.json(
    { status: "accepted", transport: "next-bridge", simulator },
    { headers: { "Cache-Control": "no-store" } }
  );
}
