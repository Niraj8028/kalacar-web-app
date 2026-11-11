import { NextResponse } from "next/server";
import { MINUTE, limitOrNull } from "@/lib/rate-limit";
import { attachRazorpayOrder, fillMissingCustomerPhone, releaseOrderAfterPaymentSetupFailure, reserveOrder } from "@/lib/catalogue-db";
import { createAddress, findMatchingAddress, parseAddress } from "@/lib/addresses";
import { getGiftWrap, giftWrapCharge } from "@/lib/settings";
import { currentCustomer } from "@/lib/customer-auth";
import { parseCartItems } from "@/lib/cart-items";
import { CouponError, normalizeCode } from "@/lib/coupons";
import { SHOP_CLOSED_MESSAGE, visitorStoreAccess } from "@/lib/store-status";
import { razorpayKeys } from "@/lib/payment-status";

export async function POST(request: Request) {
  const account = await currentCustomer();
  if (!account) return NextResponse.json({ error: "Sign in before checkout. Your orders are saved to your account." }, { status: 401 });
  // A database problem here refuses the order too, rather than letting one through a closed shop.
  const access = await visitorStoreAccess().catch(() => null);
  if (!access) return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again shortly." }, { status: 503 });
  if (access.closed) return NextResponse.json({ error: SHOP_CLOSED_MESSAGE }, { status: 403 });
  const limited = limitOrNull([{ key: `checkout:user:${account.id}`, limit: 10, windowMs: 10 * MINUTE }], "Too many checkout attempts. Please wait a few minutes, or check your existing order in Account & orders.");
  if (limited) return limited;
  const keys = razorpayKeys();
  if (!keys) return NextResponse.json({ error: "Payments are not set up yet. Please try again later." }, { status: 503 });
  const { keyId, secret } = keys;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  const data = body as { items?: unknown; customer?: unknown; idempotencyKey?: unknown; giftWrap?: unknown; couponCode?: unknown };
  if (typeof data.idempotencyKey !== "string" || !/^[0-9a-f-]{36}$/i.test(data.idempotencyKey)) return NextResponse.json({ error: "Your checkout session has expired. Reload your bag and try again." }, { status: 400 });
  const cart = parseCartItems(data.items);
  if ("error" in cart) return NextResponse.json({ error: cart.error }, { status: 400 });
  const items = cart.items;
  const couponCode = typeof data.couponCode === "string" && data.couponCode.trim() ? normalizeCode(data.couponCode) : null;
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
  // Gift packaging: price is read from the dashboard settings now, never from the browser.
  let giftWrapPrice: number | null = null;
  if (data.giftWrap === true) {
    const gift = await getGiftWrap().catch(() => null);
    if (!gift?.enabled) return NextResponse.json({ error: "Gift packaging isn't available right now. Untick it and try again." }, { status: 409 });
    giftWrapPrice = giftWrapCharge(gift.price, items);
  }
  try { order = await reserveOrder(data.idempotencyKey, items, normalized, account.id, giftWrapPrice, couponCode); }
  catch (error) {
    // Nothing was reserved or charged; the cart shows why the coupon no longer applies.
    if (error instanceof CouponError) return NextResponse.json({ error: error.message, coupon: true }, { status: 409 });
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") return NextResponse.json({ error: "One or more items no longer have enough stock. You haven't been charged." }, { status: 409 });
    console.error("Order reservation failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not reserve your items. Please try again." }, { status: 503 });
  }
  // The browser sent an earlier checkout's key, but that order was paid or cancelled meanwhile: it starts afresh instead.
  if (order.reused && !["payment_pending", "payment_failed"].includes(order.status)) return NextResponse.json({ error: order.status === "paid" ? "This order is already paid." : "Your earlier unpaid order was cancelled.", stale: order.status === "paid" ? "paid" : "cancelled", orderId: order.id }, { status: 409 });
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
    return NextResponse.json({ error: "We couldn't start the payment. Nothing was charged; please try again." }, { status: 502 });
  }
}
