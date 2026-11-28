import { NextResponse } from "next/server";
import { parseFeedback, saveFeedback } from "@/lib/checkout-leads";
import { clientIp, hit } from "@/lib/rate-limit";

/** An answer to "Why are you leaving checkout?". */
export async function POST(request: Request) {
  const wait = hit(`checkout-feedback:${clientIp(request)}`, 10, 60 * 60 * 1000);
  if (wait) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(wait) } });
  const parsed = parseFeedback(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try { await saveFeedback(parsed.value); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Not saved." }, { status: 503 }); }
}
