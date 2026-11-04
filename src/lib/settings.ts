import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";

// Store settings the owner changes from the dashboard (seasonal pricing, offers, etc.).

export type GiftWrapSettings = { enabled: boolean; price: number; title: string; description: string };
export const GIFT_WRAP_DEFAULT: GiftWrapSettings = { enabled: false, price: 49, title: "Gift-ready packaging", description: "" };

export async function getGiftWrap(): Promise<GiftWrapSettings> {
  const db = await addressDb();
  const [rows] = await db.execute<(RowDataPacket & { value: unknown })[]>("SELECT value FROM kalacar_settings WHERE name='gift_wrap'");
  const raw = rows[0]?.value;
  const value = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<GiftWrapSettings> | undefined;
  return { ...GIFT_WRAP_DEFAULT, ...(value ?? {}) };
}

export function parseGiftWrap(body: unknown): { error: string } | { value: GiftWrapSettings } {
  if (!body || typeof body !== "object") return { error: "Invalid settings." };
  const b = body as Record<string, unknown>;
  const price = Number(b.price);
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const description = typeof b.description === "string" ? b.description.trim() : "";
  if (!Number.isSafeInteger(price) || price < 0 || price > 10_000) return { error: "Gift packaging price must be a whole number from ₹0 to ₹10,000." };
  if (title.length < 2 || title.length > 60) return { error: "Give gift packaging a title (2–60 characters)." };
  if (description.length > 200) return { error: "Keep the description to 200 characters." };
  return { value: { enabled: b.enabled === true, price, title, description } };
}

export async function saveGiftWrap(value: GiftWrapSettings) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_settings (name,value) VALUES ('gift_wrap',?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [JSON.stringify(value)]);
}
