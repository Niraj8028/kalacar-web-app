import { NextResponse } from "next/server";
import { orderForViewer } from "@/lib/order-access";
import { cancelIfUnpaid } from "@/lib/order-payment-sync";

/** The customer cancels their own unpaid order. Razorpay is asked first, so a paid order is never cancelled. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const access = await orderForViewer(id);
  if (!access) return NextResponse.json({ error: "Order not found. Sign in with the email you ordered with to see it." }, { status: 404 });
  const { order, owner: customer } = access;
  if (!["payment_pending", "payment_failed"].includes(order.status)) return NextResponse.json({ status: order.status });
  try {
    const outcome = await cancelIfUnpaid(order, customer.id, "Cancelled by the customer");
    if (outcome === "in_progress") return NextResponse.json({ error: "A payment for this order is still being processed, so it can't be cancelled yet. Please check again in a few minutes." }, { status: 409 });
    return NextResponse.json({ status: outcome === "not_unpaid" ? (await orderForViewer(id))?.order.status ?? "cancelled" : outcome });
  } catch (error) {
    console.error("Customer cancel failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "We couldn't check this order's payment just now, so it hasn't been cancelled. Please try again shortly." }, { status: 503 });
  }
}
