import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer-auth";
import { findCustomerOrder } from "@/lib/catalogue-db";
import { syncOrderPayment } from "@/lib/order-payment-sync";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "Sign in to check this order." }, { status: 401 });
  const { id } = await context.params;
  const order = await findCustomerOrder(id, customer.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!["payment_pending", "payment_failed"].includes(order.status) || !order.razorpayOrderId) return NextResponse.json({ status: order.status });
  try {
    const { status } = await syncOrderPayment({ ...order, razorpayOrderId: order.razorpayOrderId }, customer.id);
    return NextResponse.json({ status });
  } catch (error) {
    console.error("Order payment resync failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Payment status could not be reached. Your order is still saved; check again shortly." }, { status: 503 });
  }
}
