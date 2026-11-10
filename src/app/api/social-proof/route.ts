import { NextResponse, connection } from "next/server";
import { getProductPage } from "@/lib/site-content";
import { readSocialProof } from "@/lib/social-proof";

/** Real paid-order figures. Each part is sent only if the owner has turned it on; first names only if chosen. */
export async function GET() {
  await connection();
  try {
    const settings = await getProductPage();
    const proof = await readSocialProof(settings.soldThisWeek.hours);
    return NextResponse.json({
      recent: settings.recentSales.show ? proof.recent.map(sale => ({ ...sale, firstName: settings.recentSales.showFirstName ? sale.firstName : "" })) : [],
      soldThisWeek: settings.soldThisWeek.show ? proof.soldThisWeek : {},
    }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ recent: [], soldThisWeek: {} }, { headers: { "Cache-Control": "no-store" } }); }
}
