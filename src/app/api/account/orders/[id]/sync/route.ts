import { NextResponse } from "next/server";
import { orderForViewer } from "@/lib/order-access";
import { syncOrderPayment } from "@/lib/order-payment-sync";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const access = await orderForViewer(id);
  if (!access) return NextResponse.json({ error: "Order not found. Sign in with the email you ordered with to see it." }, { status: 404 });
  const { order, owner: customer } = access;
  if (!["payment_pending", "payment_failed"].includes(order.status) || !order.razorpayOrderId) return NextResponse.json({ status: order.status });
  try {
    const { status } = await syncOrderPayment({ ...order, razorpayOrderId: order.razorpayOrderId }, customer.id);
    return NextResponse.json({ status });
  } catch (error) {
    console.error("Order payment resync failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Payment status could not be reached. Your order is still saved; check again shortly." }, { status: 503 });
  }
}
