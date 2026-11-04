import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer-auth";
import { findCustomerOrder, markOrderPaid, markOrderPaymentFailed, findOrder } from "@/lib/catalogue-db";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Local payment sync is disabled." }, { status: 403 });
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "Sign in to check this order." }, { status: 401 });
  const { id } = await context.params;
  const order = await findCustomerOrder(id, customer.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!["payment_pending", "payment_failed"].includes(order.status) || !order.razorpayOrderId) return NextResponse.json({ status: order.status });
  const keyId = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId?.startsWith("rzp_test_") || !secret) return NextResponse.json({ error: "Test payment status lookup is unavailable." }, { status: 503 });
  try {
    const auth = Buffer.from(`${keyId}:${secret}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(order.razorpayOrderId)}/payments`, { headers: { Authorization: `Basic ${auth}` }, signal: AbortSignal.timeout(12000), cache: "no-store" });
    const result = await response.json() as { items?: Array<{ id?: string; order_id?: string; amount?: number; currency?: string; status?: string }> };
    if (!response.ok || !Array.isArray(result.items)) throw new Error("Razorpay status lookup failed.");
    const matching = result.items.filter(p => p.order_id === order.razorpayOrderId && p.amount === order.amount * 100 && p.currency === "INR");
    const captured = matching.find(p => p.status === "captured" && p.id);
    if (captured?.id) { await markOrderPaid(order.id, order.razorpayOrderId, captured.id); return NextResponse.json({ status: (await findOrder(order.id))?.status ?? "paid" }); }
    if (matching.length && matching.every(p => p.status === "failed")) {
      const latest = matching.find(p => p.id);
      if (latest?.id) await markOrderPaymentFailed(order.id, customer.id, latest.id);
      return NextResponse.json({ status: "payment_failed" });
    }
    return NextResponse.json({ status: "payment_pending" });
  } catch (error) {
    console.error("Order payment resync failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Payment status could not be reached. Your order is still saved; check again shortly." }, { status: 503 });
  }
}
