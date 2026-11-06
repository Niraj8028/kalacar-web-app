import { NextResponse, connection } from "next/server";
import { realtimeConfig } from "@/lib/realtime";

/** The public key only. The secret stays on the server. */
export async function GET() {
  await connection(); // read the server's current settings, never a copy saved at build time
  return NextResponse.json(realtimeConfig(), { headers: { "Cache-Control": "no-store" } });
}
