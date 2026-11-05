import { NextResponse, connection } from "next/server";
import { getGiftWrap } from "@/lib/settings";
import { visitorStoreAccess } from "@/lib/store-status";

const noStore = { "Cache-Control": "no-store" };

/** Public store settings the shop needs: gift packaging, whether it's open, and the banner. */
export async function GET() {
  await connection(); // always read live data, never a copy saved at build time
  try {
    const [gift, access] = await Promise.all([getGiftWrap(), visitorStoreAccess()]);
    return NextResponse.json({ giftWrap: gift.enabled ? gift : null, store: { open: !access.closed, previewing: access.previewing, comingSoonMessage: access.store.comingSoonMessage, announcement: access.store.announcementEnabled ? access.store.announcementText : "" } }, { headers: noStore });
  } catch { return NextResponse.json({ giftWrap: null }, { headers: noStore }); }
}
