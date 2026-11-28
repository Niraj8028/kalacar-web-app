import { NextResponse } from "next/server";
import { parseLead, saveLead } from "@/lib/checkout-leads";
import { clientIp, hit } from "@/lib/rate-limit";

/** Saves the name, mobile and bag of a shopper at checkout, so the owner can follow up if they don't pay. */
export async function POST(request: Request) {
  const wait = hit(`checkout-lead:${clientIp(request)}`, 30, 60 * 60 * 1000);
  if (wait) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(wait) } });
  const parsed = parseLead(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try { await saveLead(parsed.value); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Not saved." }, { status: 503 }); }
}
