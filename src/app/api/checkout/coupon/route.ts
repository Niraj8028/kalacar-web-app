import { NextResponse } from "next/server";
import { MINUTE, clientIp, limitOrNull } from "@/lib/rate-limit";
import { currentCustomer } from "@/lib/customer-auth";
import { parseCartItems } from "@/lib/cart-items";
import { quoteItemsSubtotal } from "@/lib/catalogue-db";
import { previewCoupon } from "@/lib/coupons";
import { getGiftWrap, giftWrapCharge } from "@/lib/settings";

/** Cart preview: does this code work for this bag, and how much does it take off? Checkout checks again. */
export async function POST(request: Request) {
  const account = await currentCustomer().catch(() => null);
  // Limits guessing codes: per IP, and per account when signed in.
  const limited = limitOrNull([{ key: `coupon:ip:${clientIp(request)}`, limit: 30, windowMs: 10 * MINUTE }, ...(account ? [{ key: `coupon:user:${account.id}`, limit: 20, windowMs: 10 * MINUTE }] : [])], "Too many coupon attempts. Please wait a few minutes and try again.");
  if (limited) return limited;
  let body: { code?: unknown; items?: unknown; giftWrap?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const cart = parseCartItems(body.items);
  if ("error" in cart) return NextResponse.json({ error: cart.error }, { status: 400 });
  try {
    const subtotal = await quoteItemsSubtotal(cart.items);
    if (subtotal === null) return NextResponse.json({ error: "Something in your bag is no longer available. Refresh the bag and try again." }, { status: 409 });
    const gift = body.giftWrap === true ? await getGiftWrap().catch(() => null) : null;
    const result = await previewCoupon(typeof body.code === "string" ? body.code : "", account?.id ?? null, subtotal, gift?.enabled ? giftWrapCharge(gift.price, cart.items) : 0);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
    return NextResponse.json({ code: result.coupon.code, discount: result.discount, description: result.description, itemsSubtotal: subtotal, signInNeeded: !account && result.coupon.oncePerCustomer });
  } catch (error) {
    console.error("Coupon preview failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Coupons are temporarily unavailable." }, { status: 503 });
  }
}
