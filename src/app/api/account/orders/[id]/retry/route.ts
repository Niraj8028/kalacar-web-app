import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer-auth";
import { findCustomerOrder } from "@/lib/catalogue-db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "Sign in to retry this order." }, { status: 401 });
  const { id } = await context.params;
  const order = await findCustomerOrder(id, customer.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ error: "This order is already paid." }, { status: 409 });
  if (!["payment_pending", "payment_failed"].includes(order.status)) return NextResponse.json({ error: "This order can no longer be paid. Contact us on WhatsApp if you need help." }, { status: 409 });
  if (!order.razorpayOrderId) return NextResponse.json({ error: "This order has no payment session to retry. Contact support so we can check it." }, { status: 409 });
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId?.startsWith("rzp_test_")) return NextResponse.json({ error: "Razorpay test mode is not configured." }, { status: 503 });
  return NextResponse.json({ orderId: order.id, razorpayOrderId: order.razorpayOrderId, amount: order.amount * 100, currency: "INR", keyId, customer: { name: customer.name, email: customer.email, phone: customer.phone } });
}
