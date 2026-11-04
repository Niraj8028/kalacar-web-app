import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";
import { ownerEmails } from "@/lib/google-oauth";

// Customers for the owner dashboard, derived from accounts + orders. Owner accounts are included but flagged
// (isOwner) so the dashboard can show the owner's own test orders without counting them as customers.
// "Paid" means money was received: paid, refunded (paid then refunded) or paid after cancel.
const PAID = "('paid','refunded','paid_after_cancel')";

type CustomerRow = RowDataPacket & {
  id: string; name: string; email: string; phone: string; google: number; created_at: Date;
  paid_orders: number; all_orders: number; gross: number; refunded: number; last_order: Date | null;
  last_pincode: string | null; addr_city: string | null; addr_pincode: string | null;
};

export async function listCustomers() {
  const db = await addressDb();
  const owners = ownerEmails();
  const [rows] = await db.query<CustomerRow[]>(`
    SELECT u.id, u.name, u.email, u.phone, u.google_sub IS NOT NULL AS google, u.created_at,
      COALESCE(SUM(o.status IN ${PAID}), 0) AS paid_orders,
      COUNT(o.id) AS all_orders,
      COALESCE(SUM(CASE WHEN o.status IN ${PAID} THEN o.amount ELSE 0 END), 0) AS gross,
      COALESCE(SUM(CASE WHEN o.status IN ${PAID} THEN COALESCE(o.refund_amount, 0) ELSE 0 END), 0) AS refunded,
      MAX(o.created_at) AS last_order,
      (SELECT o2.pincode FROM kalacar_orders o2 WHERE o2.user_id=u.id ORDER BY o2.created_at DESC LIMIT 1) AS last_pincode,
      (SELECT a.city FROM kalacar_addresses a WHERE a.user_id=u.id ORDER BY a.is_default DESC, a.updated_at DESC LIMIT 1) AS addr_city,
      (SELECT a.pincode FROM kalacar_addresses a WHERE a.user_id=u.id ORDER BY a.is_default DESC, a.updated_at DESC LIMIT 1) AS addr_pincode
    FROM kalacar_users u LEFT JOIN kalacar_orders o ON o.user_id=u.id
    GROUP BY u.id ORDER BY u.created_at DESC`);
  return rows.map(r => ({
    id: r.id, name: r.name, email: r.email, phone: r.phone, google: Boolean(r.google), joined: r.created_at,
    isOwner: owners.includes(r.email.toLowerCase()),
    paidOrders: Number(r.paid_orders), allOrders: Number(r.all_orders),
    spent: Number(r.gross) - Number(r.refunded), refunded: Number(r.refunded), lastOrder: r.last_order,
    city: r.addr_city ?? "", pincode: r.addr_pincode ?? r.last_pincode ?? "",
  }));
}

type OrderRow = RowDataPacket & { id: string; created_at: Date; amount: number; status: string; fulfillment_status: string; refund_amount: number | null; gift_wrap: number; pincode: string; address: string };
type ItemRow = RowDataPacket & { order_id: string; product_name: string; variant_name: string | null; unit_price: number; quantity: number };
type AddressRow = RowDataPacket & { label: string; full_name: string; phone: string; address: string; city: string; state: string; pincode: string; is_default: number };

export async function getCustomer(id: string) {
  const db = await addressDb();
  const [users] = await db.execute<(RowDataPacket & { id: string; name: string; email: string; phone: string; google: number; created_at: Date })[]>("SELECT id, name, email, phone, google_sub IS NOT NULL AS google, created_at FROM kalacar_users WHERE id=?", [id]);
  const user = users[0];
  if (!user) return null;
  const [orders] = await db.execute<OrderRow[]>("SELECT id, created_at, amount, status, fulfillment_status, refund_amount, gift_wrap, pincode, address FROM kalacar_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 200", [id]);
  const [items] = orders.length ? await db.query<ItemRow[]>("SELECT order_id, product_name, variant_name, unit_price, quantity FROM kalacar_order_items WHERE order_id IN (?) ORDER BY id", [orders.map(o => o.id)]) : [[] as ItemRow[]];
  const [addresses] = await db.execute<AddressRow[]>("SELECT label, full_name, phone, address, city, state, pincode, is_default FROM kalacar_addresses WHERE user_id=? ORDER BY is_default DESC, updated_at DESC", [id]);
  const paid = orders.filter(o => ["paid", "refunded", "paid_after_cancel"].includes(o.status));
  return {
    id: user.id, name: user.name, email: user.email, phone: user.phone, google: Boolean(user.google), joined: user.created_at,
    isOwner: ownerEmails().includes(user.email.toLowerCase()),
    totals: {
      paidOrders: paid.length, allOrders: orders.length,
      spent: paid.reduce((s, o) => s + Number(o.amount) - Number(o.refund_amount ?? 0), 0),
      refunded: paid.reduce((s, o) => s + Number(o.refund_amount ?? 0), 0),
      firstOrder: orders.length ? orders[orders.length - 1].created_at : null, lastOrder: orders[0]?.created_at ?? null,
    },
    addresses: addresses.map(a => ({ label: a.label, fullName: a.full_name, phone: a.phone, address: a.address, city: a.city, state: a.state, pincode: a.pincode, isDefault: Boolean(a.is_default) })),
    orders: orders.map(o => ({
      id: o.id, date: o.created_at, total: Number(o.amount), status: o.status, fulfillmentStatus: o.fulfillment_status,
      refundAmount: o.refund_amount === null ? null : Number(o.refund_amount), giftWrap: Boolean(o.gift_wrap), pincode: o.pincode,
      items: items.filter(i => i.order_id === o.id).map(i => ({ name: i.product_name, colour: i.variant_name && i.variant_name !== "Standard" ? i.variant_name : "", price: Number(i.unit_price), quantity: Number(i.quantity) })),
    })),
  };
}
