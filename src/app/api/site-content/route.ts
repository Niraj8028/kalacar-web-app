import { NextResponse, connection } from "next/server";
import { getSiteContent } from "@/lib/site-content";

/** Home and product page settings for the shop. If this fails, the shop uses its built-in defaults. */
export async function GET() {
  await connection();
  try { return NextResponse.json(await getSiteContent(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
