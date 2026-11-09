import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";
import { DEFAULT_BRAND, LOGO_WIDTH } from "@/data/site-content";
import type { BrandSettings } from "@/data/site-content";

// The shop logo, set in dashboard Settings. Shown in the header and footer of every page.
const ROW = "brand";

/** Only photos stored by this site; anything else falls back to the built-in logo. */
export function parseBrand(input: unknown): BrandSettings {
  const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const logo = typeof body.logo === "string" ? body.logo.trim().slice(0, 300) : "";
  const width = Number.isSafeInteger(body.width) && Number(body.width) >= LOGO_WIDTH.min && Number(body.width) <= LOGO_WIDTH.max ? Number(body.width) : 0;
  return { logo: /^\/(uploads|images)\/[\w./-]+$/.test(logo) && !logo.includes("..") ? logo : "", width, white: body.white === true };
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
