import type mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";
import { RESERVED_STATUSES, USED_STATUSES, limitStatus, oncePerCustomerError, usageLimitError } from "@/lib/coupon-uses";

// Coupons are created in the owner dashboard and checked on the server at checkout.
// Rules (owner decisions 2026-11-04): the discount applies to murtis only, not gift packaging;
// a use counts only once payment succeeds (owner decision 2026-11-05); until then an unpaid order
// reserves it for Retry, and setup failure or cancelling releases it. A refund doesn't give the use
// back. "Once per customer" is on by default.

export type CouponType = "percent" | "fixed";
export type CouponInput = { code: string; type: CouponType; amount: number; maxDiscount: number | null; minSpend: number; usageLimit: number | null; oncePerCustomer: boolean; startsOn: string | null; expiresOn: string | null; active: boolean };
export type Coupon = CouponInput & { id: number };

const CODE = /^[A-Z0-9][A-Z0-9-]{2,31}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const prettyDate = (d: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
/** Today's date in India, as YYYY-MM-DD (coupon dates are whole days in IST). */
export const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
export const normalizeCode = (value: unknown) => typeof value === "string" ? value.trim().toUpperCase().replace(/\s+/g, "") : "";

export class CouponError extends Error {}

type CouponRow = RowDataPacket & { id: number; code: string; type: string; amount: number; max_discount: number | null; min_spend: number; usage_limit: number | null; once_per_customer: number; starts_on: string | null; expires_on: string | null; active: number };
const COLUMNS = "id, code, type, amount, max_discount, min_spend, usage_limit, once_per_customer, DATE_FORMAT(starts_on,'%Y-%m-%d') AS starts_on, DATE_FORMAT(expires_on,'%Y-%m-%d') AS expires_on, active";
const fromRow = (r: CouponRow): Coupon => ({ id: Number(r.id), code: r.code, type: r.type === "fixed" ? "fixed" : "percent", amount: Number(r.amount), maxDiscount: r.max_discount === null ? null : Number(r.max_discount), minSpend: Number(r.min_spend), usageLimit: r.usage_limit === null ? null : Number(r.usage_limit), oncePerCustomer: Boolean(r.once_per_customer), startsOn: r.starts_on, expiresOn: r.expires_on, active: Boolean(r.active) });

/** Short description shown to customers, e.g. "10% off murtis (up to ₹200)". */
export function describeCoupon(c: Pick<Coupon, "type" | "amount" | "maxDiscount" | "minSpend">) {
  const base = c.type === "percent" ? `${c.amount}% off murtis${c.maxDiscount ? ` (up to ${money(c.maxDiscount)})` : ""}` : `${money(c.amount)} off murtis`;
  return c.minSpend > 0 ? `${base} on orders of ${money(c.minSpend)} or more` : base;
}

/** Discount in whole rupees on the murtis' total; the order total always stays at least ₹1 (Razorpay minimum). */
export function discountFor(c: Coupon, itemsSubtotal: number, extras = 0) {
  const raw = c.type === "percent" ? Math.round(itemsSubtotal * c.amount / 100) : c.amount;
  const capped = c.maxDiscount ? Math.min(raw, c.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, itemsSubtotal, itemsSubtotal + extras - 1));
}

type Check = { ok: true; coupon: Coupon; discount: number; description: string } | { ok: false; error: string };

async function countUses(db: mysql.Pool | mysql.PoolConnection, where: string, values: Array<string | number>) {
  const [[row]] = await db.execute<(RowDataPacket & { used: number | null; reserved: number | null })[]>(`SELECT COALESCE(SUM(status IN ${USED_STATUSES}),0) AS used, COALESCE(SUM(status IN ${RESERVED_STATUSES}),0) AS reserved FROM kalacar_orders WHERE ${where}`, values);
  return { used: Number(row.used), reserved: Number(row.reserved) };
}

/** Checks a code for a cart. With a connection it locks the coupon row (use inside the checkout transaction). */
async function check(db: mysql.Pool | mysql.PoolConnection, rawCode: string, userId: string | null, itemsSubtotal: number, extras: number, lock: boolean): Promise<Check> {
  const code = normalizeCode(rawCode);
  if (!CODE.test(code)) return { ok: false, error: "That coupon code isn't valid." };
  const [rows] = await db.execute<CouponRow[]>(`SELECT ${COLUMNS} FROM kalacar_coupons WHERE code=?${lock ? " FOR UPDATE" : ""}`, [code]);
  const row = rows[0];
  if (!row || !row.active) return { ok: false, error: "That coupon code isn't valid." };
  const coupon = fromRow(row);
  const today = todayIST();
  if (coupon.startsOn && today < coupon.startsOn) return { ok: false, error: `This coupon starts on ${prettyDate(coupon.startsOn)}.` };
  if (coupon.expiresOn && today > coupon.expiresOn) return { ok: false, error: `This coupon expired on ${prettyDate(coupon.expiresOn)}.` };
  if (itemsSubtotal < coupon.minSpend) return { ok: false, error: `Add ${money(coupon.minSpend - itemsSubtotal)} more of murtis to use this coupon (minimum ${money(coupon.minSpend)}).` };
  if (coupon.usageLimit !== null) {
    const counts = await countUses(db, "coupon_id=?", [coupon.id]);
    const error = usageLimitError(coupon.usageLimit, counts.used, counts.reserved);
    if (error) return { ok: false, error };
  }
  if (coupon.oncePerCustomer && userId) {
    const mine = await countUses(db, "coupon_id=? AND user_id=?", [coupon.id, userId]);
    const error = oncePerCustomerError(mine.used, mine.reserved);
    if (error) return { ok: false, error };
  }
  const discount = discountFor(coupon, itemsSubtotal, extras);
  if (discount < 1) return { ok: false, error: "This coupon doesn't lower the price of this bag." };
  return { ok: true, coupon, discount, description: describeCoupon(coupon) };
}

/** Inside the checkout transaction: row-locked check. */
export const applyCoupon = (connection: mysql.PoolConnection, code: string, userId: string, itemsSubtotal: number, extras: number) => check(connection, code, userId, itemsSubtotal, extras, true);
/** Cart preview (no lock). */
export async function previewCoupon(code: string, userId: string | null, itemsSubtotal: number, extras: number) { return check(await addressDb(), code, userId, itemsSubtotal, extras, false); }

/** Validates the dashboard editor's input. */
export function parseCoupon(body: unknown): { value: CouponInput } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid coupon." };
  const b = body as Record<string, unknown>;
  const code = normalizeCode(b.code);
  if (!CODE.test(code)) return { error: "Code must be 3–32 letters, numbers or dashes (it's saved in capitals)." };
  const type = b.type === "fixed" ? "fixed" : b.type === "percent" ? "percent" : null;
  if (!type) return { error: "Choose Percentage off or Fixed ₹ off." };
  const whole = (v: unknown) => typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  const optional = (v: unknown) => v === null || v === undefined || v === "" ? null : whole(v);
  const amount = whole(b.amount);
  if (!Number.isInteger(amount) || amount < 1) return { error: "Enter the discount as a whole number of at least 1." };
  if (type === "percent" && amount > 90) return { error: "A percentage discount can be at most 90%." };
  if (type === "fixed" && amount > 100000) return { error: "That fixed discount is too large." };
  const maxDiscount = type === "percent" ? optional(b.maxDiscount) : null;
  if (maxDiscount !== null && (!Number.isInteger(maxDiscount) || maxDiscount < 1 || maxDiscount > 100000)) return { error: "Maximum discount must be a whole number of rupees, or left empty." };
  const minSpend = optional(b.minSpend) ?? 0;
  if (!Number.isInteger(minSpend) || minSpend < 0 || minSpend > 1000000) return { error: "Minimum spend must be a whole number of rupees, or left empty." };
  const usageLimit = optional(b.usageLimit);
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1 || usageLimit > 1000000)) return { error: "Total uses must be a whole number of at least 1, or left empty for no limit." };
  const date = (v: unknown) => v === null || v === undefined || v === "" ? null : typeof v === "string" && DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ? v : undefined;
  const startsOn = date(b.startsOn), expiresOn = date(b.expiresOn);
  if (startsOn === undefined || expiresOn === undefined) return { error: "Dates must be valid calendar dates." };
  if (startsOn && expiresOn && expiresOn < startsOn) return { error: "The expiry date must be on or after the start date." };
  return { value: { code, type, amount, maxDiscount, minSpend, usageLimit, oncePerCustomer: b.oncePerCustomer !== false, startsOn, expiresOn, active: b.active !== false } };
}

type ListRow = CouponRow & { used_uses: number; reserved_uses: number; given: number };
export async function listCoupons() {
  const db = await addressDb();
  const [rows] = await db.query<ListRow[]>(`SELECT c.id, c.code, c.type, c.amount, c.max_discount, c.min_spend, c.usage_limit, c.once_per_customer,
      DATE_FORMAT(c.starts_on,'%Y-%m-%d') AS starts_on, DATE_FORMAT(c.expires_on,'%Y-%m-%d') AS expires_on, c.active,
      COALESCE(SUM(o.status IN ${USED_STATUSES}), 0) AS used_uses,
      COALESCE(SUM(o.status IN ${RESERVED_STATUSES}), 0) AS reserved_uses,
      COALESCE(SUM(CASE WHEN o.status IN ${USED_STATUSES} THEN o.discount ELSE 0 END), 0) AS given
    FROM kalacar_coupons c LEFT JOIN kalacar_orders o ON o.coupon_id=c.id GROUP BY c.id ORDER BY c.created_at DESC`);
  const today = todayIST();
  return rows.map(r => {
    const c = fromRow(r); const used = Number(r.used_uses); const reserved = Number(r.reserved_uses);
    const status = !c.active ? "off" : c.expiresOn && today > c.expiresOn ? "expired" : c.startsOn && today < c.startsOn ? "scheduled" : limitStatus(c.usageLimit, used, reserved);
    return { ...c, used, reserved, discountGiven: Number(r.given), status, description: describeCoupon(c) };
  });
}

const duplicate = (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && (error as { code: string }).code === "ER_DUP_ENTRY");
const values = (c: CouponInput) => [c.code, c.type, c.amount, c.maxDiscount, c.minSpend, c.usageLimit, c.oncePerCustomer ? 1 : 0, c.startsOn, c.expiresOn, c.active ? 1 : 0];

export async function createCoupon(c: CouponInput) {
  const db = await addressDb();
  try {
    const [result] = await db.execute<mysql.ResultSetHeader>("INSERT INTO kalacar_coupons (code,type,amount,max_discount,min_spend,usage_limit,once_per_customer,starts_on,expires_on,active) VALUES (?,?,?,?,?,?,?,?,?,?)", values(c));
    return { ok: true as const, id: result.insertId };
  } catch (error) { if (duplicate(error)) return { ok: false as const, error: `A coupon called ${c.code} already exists.` }; throw error; }
}

export async function updateCoupon(id: number, c: CouponInput) {
  const db = await addressDb();
  try {
    const [result] = await db.execute<mysql.ResultSetHeader>("UPDATE kalacar_coupons SET code=?,type=?,amount=?,max_discount=?,min_spend=?,usage_limit=?,once_per_customer=?,starts_on=?,expires_on=?,active=? WHERE id=?", [...values(c), id]);
    return result.affectedRows ? { ok: true as const } : { ok: false as const, error: "Coupon not found.", status: 404 };
  } catch (error) { if (duplicate(error)) return { ok: false as const, error: `A coupon called ${c.code} already exists.`, status: 409 }; throw error; }
}

export async function setCouponActive(id: number, active: boolean) {
  const [result] = await (await addressDb()).execute<mysql.ResultSetHeader>("UPDATE kalacar_coupons SET active=? WHERE id=?", [active ? 1 : 0, id]);
  return result.affectedRows > 0;
}

/** A coupon that any order has used can't be deleted (orders keep the record); switch it off instead. */
export async function deleteCoupon(id: number) {
  const db = await addressDb();
  const [[used]] = await db.execute<(RowDataPacket & { n: number })[]>("SELECT COUNT(*) AS n FROM kalacar_orders WHERE coupon_id=?", [id]);
  if (Number(used.n) > 0) return { ok: false as const, error: "This coupon has been used on orders, so it can't be deleted. Switch it off instead.", status: 409 };
  const [result] = await db.execute<mysql.ResultSetHeader>("DELETE FROM kalacar_coupons WHERE id=?", [id]);
  return result.affectedRows ? { ok: true as const } : { ok: false as const, error: "Coupon not found.", status: 404 };
}
