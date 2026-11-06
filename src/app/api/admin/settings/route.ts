import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { getGiftWrap, parseGiftWrap, saveGiftWrap } from "@/lib/settings";
import { getShopLink, parseShopLink, saveShopLink } from "@/lib/shop-link";
import { getStoreSettings, parseStoreSettings, saveStoreSettings } from "@/lib/store-status";
import { signalled } from "@/lib/realtime";

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  try { return NextResponse.json({ giftWrap: await getGiftWrap(), store: await getStoreSettings(), shopLink: await getShopLink() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Settings are unavailable right now." }, { status: 503 }); }
}

async function handlePATCH(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;
  const body = await request.json().catch(() => null) as { giftWrap?: unknown; store?: unknown; shopLink?: unknown } | null;
  if (body?.shopLink !== undefined) {
    const link = parseShopLink(body.shopLink);
    if ("error" in link) return NextResponse.json({ error: link.error }, { status: 400 });
    try { await saveShopLink(link.value); return NextResponse.json({ shopLink: await getShopLink() }); }
    catch { return NextResponse.json({ error: "Could not save settings." }, { status: 503 }); }
  }
  if (body?.store !== undefined) {
    const store = parseStoreSettings(body.store);
    if ("error" in store) return NextResponse.json({ error: store.error }, { status: 400 });
    try { await saveStoreSettings(store.value); return NextResponse.json({ store: store.value }); }
    catch { return NextResponse.json({ error: "Could not save settings." }, { status: 503 }); }
  }
  const parsed = parseGiftWrap(body?.giftWrap);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try { await saveGiftWrap(parsed.value); return NextResponse.json({ giftWrap: parsed.value }); }
  catch { return NextResponse.json({ error: "Could not save settings." }, { status: 503 }); }
}

export const PATCH = signalled(["store", "settings"], handlePATCH);
