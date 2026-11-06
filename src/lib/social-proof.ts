import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";

// Figures from real paid orders only. Kept for a minute so visitors share one read.
export type RecentSale = { productId: string; productName: string; hoursAgo: number; firstName: string };
export type SocialProof = { recent: RecentSale[]; soldThisWeek: Record<string, number> };
type Cache = { at: number; value: SocialProof } | null;
const holder = globalThis as unknown as { kalacarSocialProof?: Cache };
const FRESH_FOR_MS = 60000;

export async function readSocialProof(): Promise<SocialProof> {
  const saved = holder.kalacarSocialProof;
  if (saved && Date.now() - saved.at < FRESH_FOR_MS) return saved.value;
  const db = await addressDb();
  const [recent] = await db.query<(RowDataPacket & { product_id: string; product_name: string; hours_ago: number; customer_name: string })[]>("SELECT i.product_id,i.product_name,TIMESTAMPDIFF(HOUR,o.created_at,NOW()) AS hours_ago,o.customer_name FROM kalacar_orders o JOIN kalacar_order_items i ON i.order_id=o.id WHERE o.status='paid' AND o.created_at > NOW() - INTERVAL 7 DAY ORDER BY o.created_at DESC LIMIT 10");
  const [sold] = await db.query<(RowDataPacket & { product_id: string; total: number })[]>("SELECT i.product_id,SUM(i.quantity) AS total FROM kalacar_orders o JOIN kalacar_order_items i ON i.order_id=o.id WHERE o.status='paid' AND o.created_at > NOW() - INTERVAL 7 DAY GROUP BY i.product_id");
  const value: SocialProof = {
    recent: recent.map(row => ({ productId: row.product_id, productName: row.product_name, hoursAgo: Number(row.hours_ago), firstName: row.customer_name.trim().split(/\s+/)[0] ?? "" })),
    soldThisWeek: Object.fromEntries(sold.map(row => [row.product_id, Number(row.total)])),
  };
  holder.kalacarSocialProof = { at: Date.now(), value };
  return value;
}
