import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";

// The address the dashboard's "Visit website" link opens. Set in dashboard Settings.
const ROW = "shop_link";
const MAX_LENGTH = 200;

/** Only plain web addresses, so a saved link can't run code when it's clicked. http is for local testing. */
export function parseShopLink(input: unknown): { error: string } | { value: string } {
  const text = typeof input === "string" ? input.trim() : "";
  if (!text) return { value: "" };
  if (text.length > MAX_LENGTH) return { error: `Keep the website link to ${MAX_LENGTH} characters.` };
  let url: URL;
  try { url = new URL(text); } catch { return { error: "Enter the full website link, starting with https://" }; }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return { error: "The website link must start with https://" };
  if (url.username || url.password) return { error: "Enter the website link without a username or password." };
  return { value: url.href };
}

/** The saved link, or the shop's own address if none is saved. */
export async function getShopLink() {
  const db = await addressDb();
  const [rows] = await db.execute<(RowDataPacket & { value: unknown })[]>("SELECT value FROM kalacar_settings WHERE name=?", [ROW]);
  const raw = rows[0]?.value;
  const saved = raw === undefined ? "" : typeof raw === "string" ? JSON.parse(raw) as unknown : raw;
  const parsed = parseShopLink(saved);
  const link = "value" in parsed ? parsed.value : "";
  if (link) return link;
  const fallback = parseShopLink(process.env.NEXT_PUBLIC_SITE_URL);
  return "value" in fallback ? fallback.value : "";
}

export async function saveShopLink(value: string) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_settings (name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [ROW, JSON.stringify(value)]);
}
