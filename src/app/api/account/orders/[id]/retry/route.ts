import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer-auth";
import { findCustomerOrder } from "@/lib/catalogue-db";
import { syncOrderPayment } from "@/lib/order-payment-sync";
import { razorpayKeys } from "@/lib/payment-status";

/** Asks Razorpay first, and reopens payment only if nothing has been paid or is being processed. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "Sign in to retry this order." }, { status: 401 });
  const { id } = await context.params;
  const order = await findCustomerOrder(id, customer.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ status: "paid" });
  if (order.status === "cancelled") return NextResponse.json({ status: "cancelled" });
  if (!["payment_pending", "payment_failed"].includes(order.status)) return NextResponse.json({ error: "This order can no longer be paid. Contact us on WhatsApp if you need help." }, { status: 409 });
  if (!order.razorpayOrderId) return NextResponse.json({ error: "This order has no payment session to retry. Contact support so we can check it." }, { status: 409 });
  const keyId = razorpayKeys()?.keyId;
  if (!keyId) return NextResponse.json({ error: "Payments are not set up yet. Please try again later." }, { status: 503 });
  try {
    const { decision, status } = await syncOrderPayment({ ...order, razorpayOrderId: order.razorpayOrderId }, customer.id);
    if (decision.kind === "paid") return NextResponse.json({ status });
    if (decision.kind === "in_progress") return NextResponse.json({ error: "A payment for this order is still being processed, so we haven't reopened payment. Please check again in a few minutes." }, { status: 409 });
    if (decision.kind === "mismatch") return NextResponse.json({ error: "This order's payment needs a manual check, so we haven't reopened payment. Contact us on WhatsApp." }, { status: 409 });
  } catch (error) {
    console.error("Retry status check failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "We couldn't confirm this order's payment status, so we haven't reopened payment. Please try again shortly." }, { status: 503 });
  }
  return NextResponse.json({ status: "retry", orderId: order.id, razorpayOrderId: order.razorpayOrderId, amount: order.amount * 100, currency: "INR", keyId, customer: { name: customer.name, email: customer.email, phone: customer.phone } });
}
