import { NextResponse } from "next/server";
import { getSimulatorState } from "@/lib/server/simulator-store";

/**
 * Same-origin fallback for the FastAPI simulator state, used when the Python
 * backend is unreachable so the live maps still see a real line break.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSimulatorState(), {
    headers: { "Cache-Control": "no-store" },
  });
}
