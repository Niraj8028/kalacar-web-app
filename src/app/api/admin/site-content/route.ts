import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { signalled } from "@/lib/realtime";
import { getHome, getProductPage, parseHome, parseProductPage, saveHome, saveProductPage } from "@/lib/site-content";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  try { return NextResponse.json({ home: await getHome(), productPage: await getProductPage() }, { headers: noStore }); }
  catch { return NextResponse.json({ error: "Settings are unavailable right now." }, { status: 503, headers: noStore }); }
}

async function handlePATCH(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;
  const body = await request.json().catch(() => null) as { home?: unknown; productPage?: unknown } | null;
  try {
    if (body?.home !== undefined) { const home = parseHome(body.home); await saveHome(home); return NextResponse.json({ home }); }
    if (body?.productPage !== undefined) { const productPage = parseProductPage(body.productPage); await saveProductPage(productPage); return NextResponse.json({ productPage }); }
    return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  } catch { return NextResponse.json({ error: "Could not save settings." }, { status: 503 }); }
}
export const PATCH = signalled(["store", "settings"], handlePATCH);
