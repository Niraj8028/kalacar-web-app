import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";
import { DEFAULT_BRAND } from "@/data/site-content";
import type { BrandSettings } from "@/data/site-content";

// The shop logo, set in dashboard Settings. Shown in the header and footer of every page.
const ROW = "brand";

/** Only photos stored by this site; anything else falls back to the built-in logo. */
export function parseBrand(input: unknown): BrandSettings {
  const raw = (input && typeof input === "object" ? input as Record<string, unknown> : {}).logo;
  const logo = typeof raw === "string" ? raw.trim().slice(0, 300) : "";
  return { logo: /^\/(uploads|images)\/[\w./-]+$/.test(logo) && !logo.includes("..") ? logo : "" };
}

export async function getBrand(): Promise<BrandSettings> {
  const db = await addressDb();
  const [rows] = await db.execute<(RowDataPacket & { value: unknown })[]>("SELECT value FROM kalacar_settings WHERE name=?", [ROW]);
  const raw = rows[0]?.value;
  if (raw === undefined) return DEFAULT_BRAND;
  return parseBrand(typeof raw === "string" ? JSON.parse(raw) as unknown : raw);
}

export async function saveBrand(value: BrandSettings) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_settings (name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [ROW, JSON.stringify(value)]);
}
