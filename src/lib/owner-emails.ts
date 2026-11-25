import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";
import { emailEnabled, sendEmail } from "@/lib/mailer";
import { buildOwnerOrderEmail, type OwnerOrderKind } from "@/lib/email-templates";
import { fillMessage, getMessageTemplates, orderMessageValues } from "@/lib/order-messages";

// Emails to the owner about each new order: paid ones, and ones that ended without payment. Each has the
// customer's details and a ready WhatsApp message for them. A failed email never affects the order.

const ROW = "owner_emails";
export const MAX_OWNER_EMAILS = 5;
export type OwnerEmailSettings = { emails: string[]; paid: boolean; unpaid: boolean };
export const DEFAULT_OWNER_EMAILS: OwnerEmailSettings = { emails: [], paid: true, unpaid: true };
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

/** Emails can come as a list or as one comma-separated line. Refuses a typo instead of silently dropping it. */
export function parseOwnerEmails(input: unknown): { value: OwnerEmailSettings } | { error: string } {
  const body = (input && typeof input === "object" && !Array.isArray(input) ? input : {}) as Record<string, unknown>;
  const raw = Array.isArray(body.emails) ? body.emails.filter((item): item is string => typeof item === "string") : typeof body.emails === "string" ? body.emails.split(/[,;\n]/) : [];
  const emails = [...new Set(raw.map(item => item.trim().toLowerCase()).filter(Boolean))];
  const wrong = emails.find(email => email.length > 190 || !EMAIL.test(email));
  if (wrong) return { error: `“${wrong.slice(0, 60)}” isn't an email address. Separate addresses with commas.` };
  if (emails.length > MAX_OWNER_EMAILS) return { error: `Add up to ${MAX_OWNER_EMAILS} email addresses.` };
  return { value: { emails, paid: body.paid !== false, unpaid: body.unpaid !== false } };
}

export async function getOwnerEmails(): Promise<OwnerEmailSettings> {
  const db = await addressDb();
  const [rows] = await db.execute<(RowDataPacket & { value: unknown })[]>("SELECT value FROM kalacar_settings WHERE name=?", [ROW]);
  const raw = rows[0]?.value;
  if (raw === undefined) return DEFAULT_OWNER_EMAILS;
  const parsed = parseOwnerEmails(typeof raw === "string" ? JSON.parse(raw) as unknown : raw);
  return "value" in parsed ? parsed.value : DEFAULT_OWNER_EMAILS;
}

export async function saveOwnerEmails(value: OwnerEmailSettings) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_settings (name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [ROW, JSON.stringify(value)]);
}

/** Indian 10-digit numbers get 91; other numbers must already include a country code. Same rule as the dashboard. */
export function whatsappDigits(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 10) return `91${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : "";
}

type OrderRow = RowDataPacket & { id: string; amount: number; status: string; customer_name: string; email: string; phone: string; address: string; pincode: string; gift_wrap: number; gift_wrap_price: number; coupon_code: string | null; discount: number; cancel_reason: string | null; razorpay_payment_id: string | null; created_at: Date };
type ItemRow = RowDataPacket & { product_name: string; variant_name: string | null; unit_price: number; quantity: number };

/** Paid: when an order is first paid. Unpaid: when an order is cancelled by the customer or after an hour unpaid. Never throws. */
export async function emailOwnersAboutOrder(orderId: string, kind: OwnerOrderKind) {
  try {
    if (!emailEnabled()) return;
    const settings = await getOwnerEmails();
    if (!settings.emails.length || !settings[kind]) return;
    const db = await addressDb();
    const [orders] = await db.execute<OrderRow[]>("SELECT id,amount,status,customer_name,email,phone,address,pincode,gift_wrap,gift_wrap_price,coupon_code,discount,cancel_reason,razorpay_payment_id,created_at FROM kalacar_orders WHERE id=?", [orderId]);
    const order = orders[0];
    if (!order) return;
    const [items] = await db.execute<ItemRow[]>("SELECT product_name,variant_name,unit_price,quantity FROM kalacar_order_items WHERE order_id=? ORDER BY id", [orderId]);
    const lines = items.map(item => ({ name: item.product_name, variant: item.variant_name && item.variant_name !== "Standard" ? item.variant_name : "", price: Number(item.unit_price), quantity: Number(item.quantity) }));
    const templates = await getMessageTemplates();
    const template = kind === "paid" ? templates.unfulfilled : templates.unpaid;
    const message = fillMessage(template.whatsapp, orderMessageValues({ id: order.id, customerName: order.customer_name, total: Number(order.amount), items: lines }, kind === "paid" ? "Paid" : "Not paid")).trim();
    const number = whatsappDigits(order.phone);
    const email = buildOwnerOrderEmail(kind, {
      orderId: order.id, name: order.customer_name, email: order.email, phone: order.phone, address: order.address, pincode: order.pincode, total: Number(order.amount), placedAt: order.created_at,
      items: lines, giftWrapPrice: order.gift_wrap ? Number(order.gift_wrap_price) : null, couponCode: order.coupon_code ?? "", discount: Number(order.discount ?? 0), viewLink: null,
    }, {
      status: order.status, reason: order.cancel_reason ?? "", paymentTried: Boolean(order.razorpay_payment_id),
      whatsapp: message, whatsappLink: number && message ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "",
      dashboardLink: `https://admin.kalacar.in/orders/${order.id}`,
    });
    await sendEmail({ to: settings.emails.join(", "), ...email });
  } catch (error) { console.error("Owner order email failed:", error instanceof Error ? error.message : "unknown error"); }
}
