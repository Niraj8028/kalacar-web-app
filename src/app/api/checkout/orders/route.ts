import { NextResponse } from "next/server";
import { MINUTE, limitOrNull } from "@/lib/rate-limit";
import { attachRazorpayOrder, fillMissingCustomerPhone, releaseOrderAfterPaymentSetupFailure, reserveOrder } from "@/lib/catalogue-db";
import { createAddress, findMatchingAddress, parseAddress } from "@/lib/addresses";
import { currentCustomer } from "@/lib/customer-auth";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Local test checkout is disabled outside development." }, { status: 403 });
  const account = await currentCustomer();
  if (!account) return NextResponse.json({ error: "Sign in before checkout. Your orders are saved to your account." }, { status: 401 });
  const limited = limitOrNull([{ key: `checkout:user:${account.id}`, limit: 10, windowMs: 10 * MINUTE }], "Too many checkout attempts. Please wait a few minutes, or check your existing order in Account & orders.");
  if (limited) return limited;
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
  const parsed = parseAddress(data.customer);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const delivery = parsed.value;
  const addressParts = [delivery.address, delivery.landmark && `Landmark: ${delivery.landmark}`, delivery.city, delivery.state, delivery.instructions && `Delivery instructions: ${delivery.instructions}`].filter(Boolean);
  // Recipient name/phone come from the delivery form (they may differ from the account); email stays the account's.
  const normalized = { name: delivery.fullName, email: account.email, phone: delivery.phone, address: addressParts.join("\n"), pincode: delivery.pincode };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) return NextResponse.json({ error: "Your account email is invalid. Sign in again." }, { status: 400 });
  // Best-effort extras: never block checkout on them.
  await fillMissingCustomerPhone(account.id, delivery.phone).catch(() => undefined);
  if ((data as { saveAddress?: unknown }).saveAddress === true) {
    try { if (!await findMatchingAddress(account.id, delivery)) await createAddress(account.id, delivery, false); }
    catch (error) { console.error("Saving checkout address failed:", error instanceof Error ? error.message : "unknown error"); }
  }
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
