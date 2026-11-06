import { NextResponse } from "next/server";
import { realtimeConfig } from "@/lib/realtime";

/** The public key only. The secret stays on the server. */
export async function GET() {
  return NextResponse.json(realtimeConfig(), { headers: { "Cache-Control": "no-store" } });
}
