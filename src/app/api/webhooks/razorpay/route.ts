import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { recordRazorpayWebhook } from "@/lib/catalogue-db";

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 503 });
  const rawBody = await request.text(), signature = request.headers.get("x-razorpay-signature") || "";
  if (!/^[a-f0-9]{64}$/i.test(signature)) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  const expected = createHmac("sha256", secret).update(rawBody).digest(), supplied = Buffer.from(signature, "hex");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string; status?: string } } } };
  try { event = JSON.parse(rawBody) as typeof event; } catch { return NextResponse.json({ error: "Invalid body." }, { status: 400 }); }
  const eventId = request.headers.get("x-razorpay-event-id"), payment = event.payload?.payment?.entity;
  if (!eventId || !event.event || !payment?.id || !payment.order_id || typeof payment.amount !== "number" || !payment.currency || !payment.status) return NextResponse.json({ error: "Incomplete payment event." }, { status: 400 });
  try {
    await recordRazorpayWebhook(eventId, event.event, { id: payment.id, order_id: payment.order_id, amount: payment.amount, currency: payment.currency, status: payment.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Razorpay webhook persistence failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Event could not be saved." }, { status: 503 });
  }
}
