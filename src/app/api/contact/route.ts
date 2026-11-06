import { NextResponse } from "next/server";
import { parseInquiry, saveInquiry } from "@/lib/pages";
import { clientIp, hit } from "@/lib/rate-limit";
import { announce } from "@/lib/realtime";

export async function POST(request: Request) {
  const wait = hit(`contact:customer:${clientIp(request)}`, 5, 60 * 60 * 1000);
  if (wait) return NextResponse.json({ error: "Too many messages. Please try again later, or message us on WhatsApp." }, { status: 429, headers: { "Retry-After": String(wait) } });
  const body = await request.json().catch(() => null) as { website?: unknown } | null;
  // Hidden field that people don't see, so a filled-in value means a spam bot. It gets a normal answer and isn't saved.
  if (body?.website) return NextResponse.json({ ok: true });
  const parsed = parseInquiry(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try { await saveInquiry(parsed.value); announce("inquiries"); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Your message couldn't be sent. Please message us on WhatsApp." }, { status: 503 }); }
}
