import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";

// Browser tab title, Google description and favicon, set in dashboard Settings.
const ROW = "seo";
export type SeoSettings = { title: string; description: string; favicon: string };
export const DEFAULT_SEO: SeoSettings = { title: "Kalacar — Small Devotional Murtis", description: "Shop small murtis for car dashboards, Devghars, and personal mandirs.", favicon: "" };

/** Empty title or description falls back to the built-in text; the favicon must be a photo stored by this site. */
export function parseSeo(input: unknown): SeoSettings {
  const body = (input && typeof input === "object" && !Array.isArray(input) ? input : {}) as Record<string, unknown>;
  const text = (value: unknown, max: number) => typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
  const favicon = text(body.favicon, 300);
  return {
    title: text(body.title, 120) || DEFAULT_SEO.title,
    description: text(body.description, 300) || DEFAULT_SEO.description,
    favicon: /^\/(uploads|images)\/[\w./-]+$/.test(favicon) && !favicon.includes("..") ? favicon : "",
  };
}

export async function getSeo(): Promise<SeoSettings> {
  const db = await addressDb();
  const [rows] = await db.execute<(RowDataPacket & { value: unknown })[]>("SELECT value FROM kalacar_settings WHERE name=?", [ROW]);
  const raw = rows[0]?.value;
  if (raw === undefined) return DEFAULT_SEO;
  return parseSeo(typeof raw === "string" ? JSON.parse(raw) as unknown : raw);
}

export async function saveSeo(value: SeoSettings) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_settings (name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [ROW, JSON.stringify(value)]);
}
