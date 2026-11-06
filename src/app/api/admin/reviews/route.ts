import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { signalled } from "@/lib/realtime";
import { createReview, listReviews, parseReview } from "@/lib/site-content";

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  try { return NextResponse.json({ reviews: await listReviews({ publishedOnly: false }) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Reviews are unavailable right now." }, { status: 503 }); }
}
async function handlePOST(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;
  const parsed = parseReview(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try { await createReview(parsed.value); return NextResponse.json({ ok: true }, { status: 201 }); }
  catch { return NextResponse.json({ error: "Could not save the review." }, { status: 503 }); }
}
export const POST = signalled(["store"], handlePOST);
