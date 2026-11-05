import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { getGiftWrap, parseGiftWrap, saveGiftWrap } from "@/lib/settings";

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  try { return NextResponse.json({ giftWrap: await getGiftWrap() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Settings are unavailable right now." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;
  const body = await request.json().catch(() => null) as { giftWrap?: unknown } | null;
  const parsed = parseGiftWrap(body?.giftWrap);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try { await saveGiftWrap(parsed.value); return NextResponse.json({ giftWrap: parsed.value }); }
  catch { return NextResponse.json({ error: "Could not save settings." }, { status: 503 }); }
}
