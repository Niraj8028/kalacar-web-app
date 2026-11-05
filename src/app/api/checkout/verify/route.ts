import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { findOrder, markOrderPaid } from "@/lib/catalogue-db";
import { currentCustomer } from "@/lib/customer-auth";

export async function POST(request: Request) {
  const account = await currentCustomer();
  if (!account) return NextResponse.json({ error: "Sign in to verify this order." }, { status: 401 });
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId?.startsWith("rzp_test_") || !secret) return NextResponse.json({ error: "Test payment verification is not configured." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid payment response." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid payment response." }, { status: 400 });
  const data = body as Record<string, unknown>;
  const orderId = data.orderId;
  const razorpayOrderId = data.razorpay_order_id;
  const paymentId = data.razorpay_payment_id;
  const signature = data.razorpay_signature;
  if (typeof orderId !== "string" || typeof razorpayOrderId !== "string" || typeof paymentId !== "string" || typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) return NextResponse.json({ error: "Payment response is incomplete." }, { status: 400 });
  const order = await findOrder(orderId);
  if (!order || order.userId !== account.id || order.razorpayOrderId !== razorpayOrderId) return NextResponse.json({ error: "Payment does not match your Kalacar order." }, { status: 400 });
  const expected = createHmac("sha256", secret).update(`${razorpayOrderId}|${paymentId}`).digest();
  const supplied = Buffer.from(signature, "hex");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return NextResponse.json({ error: "Payment signature could not be verified." }, { status: 400 });
  if (order.status === "paid") return NextResponse.json({ ok: true, orderId, status: "paid" });
  try {
    const auth = Buffer.from(`${keyId}:${secret}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Basic ${auth}` }, signal: AbortSignal.timeout(12000) });
    const payment = await response.json() as { order_id?: string; amount?: number; currency?: string; status?: string };
    if (!response.ok || payment.order_id !== razorpayOrderId || payment.amount !== order.amount * 100 || payment.currency !== "INR") return NextResponse.json({ error: "Razorpay payment details do not match this order." }, { status: 400 });
    if (payment.status !== "captured") return NextResponse.json({ error: "Payment is not captured yet. Please wait for confirmation." }, { status: 202 });
    const paid = await markOrderPaid(orderId, razorpayOrderId, paymentId);
    return paid ? NextResponse.json({ ok: true, orderId, status: "paid" }) : NextResponse.json({ error: "Payment was checked but order status is still pending." }, { status: 409 });
  } catch (error) {
    console.error("Payment verification unavailable:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not confirm payment with Razorpay yet. Keep this page open and retry." }, { status: 503 });
  }
}
