import { NextResponse, connection } from "next/server";
import { listReviews } from "@/lib/site-content";

export async function GET() {
  await connection();
  try { return NextResponse.json({ reviews: await listReviews({ publishedOnly: true }) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ reviews: [] }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
