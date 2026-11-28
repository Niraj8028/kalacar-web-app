import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";
import { listShopProducts } from "@/lib/shop-products";
import { getProductPage } from "@/lib/site-content";
import { DEFAULT_PRODUCT_PAGE, LEAVE_REASON_KEYS, type LeaveReasonKey } from "@/data/site-content";

// Checkouts people started but may not have paid for, and why they left. Owner-only to read.

const REASON_KEYS = new Set<string>(LEAVE_REASON_KEYS);
type LeaveReason = LeaveReasonKey;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const obj = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
const str = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

/** A 10-digit Indian mobile number, without +91 or spaces; "" if it isn't one. */
export function mobileDigits(value: unknown) {
  const digits = str(value, 20).replace(/\D/g, "").replace(/^(?:91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : "";
}

export type LeadInput = { id: string; name: string; phone: string; email: string; pincode: string; items: { id: string; variantId: string; quantity: number }[] };

export function parseLead(body: unknown): { error: string } | { value: LeadInput } {
  const input = obj(body);
  const id = str(input.id, 36), name = str(input.name, 160), phone = mobileDigits(input.phone);
  if (!UUID.test(id)) return { error: "Invalid checkout." };
  if (name.length < 2 || !phone) return { error: "A name and a 10-digit mobile number are needed." };
  const items = (Array.isArray(input.items) ? input.items : []).slice(0, 20).map(item => ({ id: str(obj(item).id, 64), variantId: str(obj(item).variantId, 64), quantity: Number(obj(item).quantity) }))
    .filter(item => item.id && Number.isSafeInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 20);
  if (!items.length) return { error: "The bag is empty." };
  const email = str(input.email, 190).toLowerCase();
  return { value: { id, name, phone, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "", pincode: /^[1-9]\d{5}$/.test(str(input.pincode, 6)) ? str(input.pincode, 6) : "", items } };
}

/** Saves or updates the lead. Item names and prices come from the catalogue, not from the browser. */
export async function saveLead(lead: LeadInput) {
  const products = await listShopProducts();
  const lines = lead.items.flatMap(item => {
    const product = products.find(p => p.id === item.id);
    const colour = product?.variants.find(v => v.id === item.variantId) ?? product?.variants[0];
    return product && colour ? [{ name: product.name, colour: colour.name, quantity: item.quantity, price: colour.price }] : [];
  });
  if (!lines.length) return;
  const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const db = await addressDb();
  await db.execute(`INSERT INTO kalacar_checkout_leads (id,name,phone,email,pincode,items,total) VALUES (?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), email=VALUES(email), pincode=VALUES(pincode), items=VALUES(items), total=VALUES(total)`,
  [lead.id, lead.name, lead.phone, lead.email, lead.pincode, JSON.stringify(lines), total]);
}

export function parseFeedback(body: unknown): { error: string } | { value: { leadId: string | null; reasons: LeaveReason[]; other: string; source: string } } {
  const input = obj(body);
  const reasons = [...new Set((Array.isArray(input.reasons) ? input.reasons : []).filter((key): key is LeaveReason => typeof key === "string" && REASON_KEYS.has(key)))];
  const other = str(input.other, 300);
  if (!reasons.length && !other) return { error: "Choose a reason." };
  const leadId = str(input.leadId, 36);
  return { value: { leadId: UUID.test(leadId) ? leadId : null, reasons, other, source: ["back", "payment", "mouse", "site"].includes(str(input.source, 20)) ? str(input.source, 20) : "" } };
}

export async function saveFeedback(value: { leadId: string | null; reasons: string[]; other: string; source: string }) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_checkout_feedback (lead_id,reasons,other,source) VALUES (?,?,?,?)", [value.leadId, JSON.stringify(value.reasons), value.other, value.source]);
}

type LeadRow = RowDataPacket & { id: string; name: string; phone: string; email: string; pincode: string; items: unknown; total: number; contacted: number; created_at: Date; updated_at: Date };
type OrderRow = RowDataPacket & { id: string; phone: string; status: string; created_at: Date };
type FeedbackRow = RowDataPacket & { id: number; lead_id: string | null; reasons: unknown; other: string; source: string; created_at: Date };
const PAID = new Set(["paid", "paid_after_cancel"]);
const json = (value: unknown) => typeof value === "string" ? JSON.parse(value) as unknown : value;

/**
 * The last 30 days of checkouts, newest first, each matched to an order from the same mobile number:
 * "paid", "unpaid" (an order was placed but not paid) or "none" (left before paying).
 */
export async function listLeads() {
  const db = await addressDb();
  const [leads] = await db.query<LeadRow[]>("SELECT * FROM kalacar_checkout_leads WHERE updated_at > NOW() - INTERVAL 30 DAY ORDER BY updated_at DESC LIMIT 300");
  const [orders] = await db.query<OrderRow[]>("SELECT id,phone,status,created_at FROM kalacar_orders WHERE created_at > NOW() - INTERVAL 31 DAY");
  const [feedback] = await db.query<FeedbackRow[]>("SELECT * FROM kalacar_checkout_feedback WHERE created_at > NOW() - INTERVAL 30 DAY ORDER BY created_at DESC LIMIT 500");
  return {
    leads: leads.map(lead => {
      const mine = orders.filter(order => mobileDigits(order.phone) === lead.phone && order.created_at.getTime() >= lead.created_at.getTime() - 3_600_000);
      const paid = mine.find(order => PAID.has(order.status));
      const order = paid ?? mine.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];
      return { id: lead.id, name: lead.name, phone: lead.phone, email: lead.email, pincode: lead.pincode, items: json(lead.items), total: lead.total, contacted: Boolean(lead.contacted), createdAt: lead.created_at.toISOString(), updatedAt: lead.updated_at.toISOString(), outcome: paid ? "paid" : order ? "unpaid" : "none", orderId: order?.id ?? null };
    }),
    feedback: feedback.map(row => ({ id: row.id, leadId: row.lead_id, reasons: json(row.reasons) as string[], other: row.other, source: row.source, createdAt: row.created_at.toISOString() })),
    // The owner's own words for each reason, as shoppers saw them.
    reasons: (await getProductPage().catch(() => DEFAULT_PRODUCT_PAGE)).leaveSurvey.reasons.map(({ key, label }) => ({ key, label })),
  };
}

export async function markLeadContacted(id: string, contacted: boolean) {
  if (!UUID.test(id)) return false;
  const db = await addressDb();
  const [result] = await db.execute("UPDATE kalacar_checkout_leads SET contacted=?, updated_at=updated_at WHERE id=?", [contacted ? 1 : 0, id]);
  return (result as { affectedRows?: number }).affectedRows === 1;
}
