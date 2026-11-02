import { NextResponse } from "next/server";
import { attachRazorpayOrder, releaseOrderAfterPaymentSetupFailure, reserveOrder } from "@/lib/catalogue-db";
import { currentCustomer } from "@/lib/customer-auth";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Local test checkout is disabled outside development." }, { status: 403 });
  const account = await currentCustomer();
  if (!account) return NextResponse.json({ error: "Sign in before checkout. Your orders are saved to your account." }, { status: 401 });
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId?.startsWith("rzp_test_") || !secret) return NextResponse.json({ error: "Razorpay test credentials are not configured." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  const data = body as { items?: unknown; customer?: unknown; idempotencyKey?: unknown };
  if (typeof data.idempotencyKey !== "string" || !/^[0-9a-f-]{36}$/i.test(data.idempotencyKey)) return NextResponse.json({ error: "Checkout session is invalid. Reload the cart and try again." }, { status: 400 });
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 10) return NextResponse.json({ error: "Your bag is empty or has too many different items." }, { status: 400 });
  const items: Array<{ id: string; quantity: number }> = [];
  const seen = new Set<string>();
  for (const raw of data.items) {
    if (!raw || typeof raw !== "object") return NextResponse.json({ error: "Invalid cart item." }, { status: 400 });
    const item = raw as { id?: unknown; quantity?: unknown };
    if (typeof item.id !== "string" || seen.has(item.id) || !Number.isSafeInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 10) return NextResponse.json({ error: "Cart quantities must be whole numbers from 1 to 10." }, { status: 400 });
    seen.add(item.id); items.push({ id: item.id, quantity: Number(item.quantity) });
  }
  if (!data.customer || typeof data.customer !== "object") return NextResponse.json({ error: "Enter your delivery details." }, { status: 400 });
  const customer = data.customer as Record<string, unknown>;
  const normalized = {
    name: account.name,
    email: account.email,
    phone: account.phone,
    address: typeof customer.address === "string" ? customer.address.trim() : "",
    pincode: typeof customer.pincode === "string" ? customer.pincode.trim() : "",
  };
  if (normalized.name.length < 2 || normalized.name.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email) || normalized.phone.replace(/\D/g, "").length < 10 || normalized.address.length < 8 || !/^\d{6}$/.test(normalized.pincode)) return NextResponse.json({ error: "Check your name, email, phone, full address, and 6-digit pincode." }, { status: 400 });
  let order: Awaited<ReturnType<typeof reserveOrder>>;
  try { order = await reserveOrder(data.idempotencyKey, items, normalized, account.id); }
  catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") return NextResponse.json({ error: "One or more items no longer have enough stock. Your cart has not been charged." }, { status: 409 });
    console.error("Order reservation failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not reserve your items. Please try again." }, { status: 503 });
  }
  if (order.razorpayOrderId) return NextResponse.json({ orderId: order.id, razorpayOrderId: order.razorpayOrderId, amount: order.amount * 100, currency: "INR", keyId });
  if (order.reused) return NextResponse.json({ error: "Your payment setup is still processing. Please wait and retry." }, { status: 409 });
  try {
    const auth = Buffer.from(`${keyId}:${secret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: order.amount * 100, currency: "INR", receipt: order.id, notes: { kalacar_order_id: order.id } }),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json() as { id?: string; error?: { description?: string } };
    if (!response.ok || !result.id) throw new Error(result.error?.description || "Razorpay order creation failed.");
    await attachRazorpayOrder(order.id, result.id);
    return NextResponse.json({ orderId: order.id, razorpayOrderId: result.id, amount: order.amount * 100, currency: "INR", keyId });
  } catch (error) {
    await releaseOrderAfterPaymentSetupFailure(order.id).catch(() => undefined);
    console.error("Razorpay order setup failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Razorpay could not start a test payment. Your reserved stock has been released." }, { status: 502 });
  }
}
