import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { addressDb, createLoginLink } from "@/lib/catalogue-db";
import { emailEnabled, sendEmail } from "@/lib/mailer";
import { buildOrderEmail, buildSignInEmail, type OrderEmailData } from "@/lib/email-templates";
import { getProductPage } from "@/lib/site-content";

// Emails to customers: the order confirmation (once, when an order is first paid) and sign-in links.

/** The links in emails point at the shop's own address. */
export function shopUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "";
  try { const url = new URL(raw); return url.protocol === "https:" || url.hostname === "localhost" ? url.origin : null; }
  catch { return null; }
}

/** One-time link that signs the customer in and opens `next`. */
export async function signInLink(userId: string, minutes: number, next = "/account") {
  const origin = shopUrl();
  if (!origin) return null;
  const token = await createLoginLink(userId, minutes);
  return `${origin}/account?signin=${encodeURIComponent(token)}${next === "/account" ? "" : `&next=${encodeURIComponent(next)}`}`;
}

const ORDER_LINK_MINUTES = 60 * 24 * 7;
const SIGN_IN_LINK_MINUTES = 30;

type OrderRow = RowDataPacket & { id: string; user_id: string | null; amount: number; status: string; customer_name: string; email: string; phone: string; address: string; pincode: string; gift_wrap: number; gift_wrap_price: number; coupon_code: string | null; discount: number; created_at: Date };
type ItemRow = RowDataPacket & { product_name: string; variant_name: string | null; unit_price: number; quantity: number };

export async function sendOrderConfirmation(orderId: string) {
  try {
    if (!emailEnabled()) { console.warn("Order confirmation email skipped: SMTP is not set up."); return; }
    const db = await addressDb();
    // Claims the order first, so the verify call, the webhook and a status check can't each send one.
    const [claimed] = await db.execute<ResultSetHeader>("UPDATE kalacar_orders SET confirmation_sent_at=UTC_TIMESTAMP() WHERE id=? AND status='paid' AND confirmation_sent_at IS NULL", [orderId]);
    if (!claimed.affectedRows) return;
    const [orders] = await db.execute<OrderRow[]>("SELECT id,user_id,amount,status,customer_name,email,phone,address,pincode,gift_wrap,gift_wrap_price,coupon_code,discount,created_at FROM kalacar_orders WHERE id=?", [orderId]);
    const order = orders[0];
    if (!order) return;
    const [items] = await db.execute<ItemRow[]>("SELECT product_name,variant_name,unit_price,quantity FROM kalacar_order_items WHERE order_id=? ORDER BY id", [orderId]);
    const data: OrderEmailData = {
      orderId: order.id, name: order.customer_name, email: order.email, phone: order.phone, address: order.address, pincode: order.pincode, total: Number(order.amount), placedAt: order.created_at,
      items: items.map(item => ({ name: item.product_name, variant: item.variant_name && item.variant_name !== "Standard" ? item.variant_name : "", price: Number(item.unit_price), quantity: Number(item.quantity) })),
      giftWrapPrice: order.gift_wrap ? Number(order.gift_wrap_price) : null, couponCode: order.coupon_code ?? "", discount: Number(order.discount ?? 0),
      viewLink: order.user_id ? await signInLink(order.user_id, ORDER_LINK_MINUTES).catch(() => null) : null,
      deliveryEstimate: await getProductPage().then(page => page.delivery.estimate).catch(() => undefined),
    };
    const email = { to: order.email, ...buildOrderEmail(data) };
    // One more try a little later if the mail server didn't take it; if that fails too, it stays marked unsent.
    if (await sendEmail(email)) return;
    await new Promise(resolve => setTimeout(resolve, 15000));
    if (!await sendEmail(email)) await db.execute("UPDATE kalacar_orders SET confirmation_sent_at=NULL WHERE id=?", [orderId]);
  } catch (error) { console.error("Order confirmation email failed:", error instanceof Error ? error.message : "unknown error"); }
}

/** Emails a sign-in link if the email has an account. Says nothing either way, so emails can't be probed. */
export async function sendSignInEmail(user: { id: string; name: string; email: string }, next: string) {
  const link = await signInLink(user.id, SIGN_IN_LINK_MINUTES, next);
  if (!link) { console.warn("Sign-in email skipped: NEXT_PUBLIC_SITE_URL is not set."); return false; }
  return sendEmail({ to: user.email, ...buildSignInEmail(user.name, link, SIGN_IN_LINK_MINUTES) });
}
