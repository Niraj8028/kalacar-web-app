import { NextResponse } from "next/server";
import { getGiftWrap } from "@/lib/settings";

/** Public store settings the shop needs (gift packaging offer). */
export async function GET() {
  try {
    const gift = await getGiftWrap();
    return NextResponse.json({ giftWrap: gift.enabled ? gift : null }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ giftWrap: null }, { headers: { "Cache-Control": "no-store" } }); }
}
