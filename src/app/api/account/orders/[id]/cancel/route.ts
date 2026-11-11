import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer-auth";
import { findCustomerOrder } from "@/lib/catalogue-db";
import { cancelIfUnpaid } from "@/lib/order-payment-sync";

/** The customer cancels their own unpaid order. Razorpay is asked first, so a paid order is never cancelled. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "Sign in to cancel this order." }, { status: 401 });
  const { id } = await context.params;
  const order = await findCustomerOrder(id, customer.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!["payment_pending", "payment_failed"].includes(order.status)) return NextResponse.json({ status: order.status });
  try {
    const outcome = await cancelIfUnpaid(order, customer.id, "Cancelled by the customer");
    if (outcome === "in_progress") return NextResponse.json({ error: "A payment for this order is still being processed, so it can't be cancelled yet. Please check again in a few minutes." }, { status: 409 });
    return NextResponse.json({ status: outcome === "not_unpaid" ? (await findCustomerOrder(id, customer.id))?.status ?? "cancelled" : outcome });
  } catch (error) {
    console.error("Customer cancel failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "We couldn't check this order's payment just now, so it hasn't been cancelled. Please try again shortly." }, { status: 503 });
  }
}
