import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";
import { DEFAULT_TRACKING, MAX_GOOGLE_TAGS } from "@/data/site-content";
import type { TrackingSettings } from "@/data/site-content";

// Ad and analytics tags (Meta Pixel, Google tags), set in dashboard Settings and loaded on every shop page.
// Only IDs are saved, never pasted code, so a typo or a bad paste can't break or hijack the shop.
const ROW = "tracking";
const META_ID = /^\d{8,20}$/;
const GOOGLE_ID = /^(GTM|G|AW|GT|DC)-[A-Z0-9]{4,15}$/;

/** Accepts the ID itself or the whole code Meta/Google gave, and picks the IDs out of it. */
export function parseTracking(input: unknown): { error: string } | { value: TrackingSettings } {
  const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const metaText = typeof body.metaPixelId === "string" ? body.metaPixelId.trim() : "";
  const metaPixelId = metaText.match(/fbq\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/)?.[1] ?? metaText.match(/[?&]id=(\d{8,20})/)?.[1] ?? metaText;
  if (metaPixelId && !META_ID.test(metaPixelId)) return { error: "The Meta Pixel ID is a number, like 4436512496660507." };
  const googleText = Array.isArray(body.googleTagIds) ? body.googleTagIds.filter(item => typeof item === "string").join(" ") : typeof body.googleTagIds === "string" ? body.googleTagIds : "";
  const googleTagIds = [...new Set(googleText.toUpperCase().match(/\b(?:GTM|G|AW|GT|DC)-[A-Z0-9]{4,15}\b/g) ?? [])];
  const leftover = googleText.toUpperCase().replace(/\b(?:GTM|G|AW|GT|DC)-[A-Z0-9]{4,15}\b/g, "").replace(/<[^>]*>|[^A-Z0-9-]/g, " ").trim();
  if (!googleTagIds.length && leftover) return { error: "Google tag IDs look like GTM-KZJ27PVT, G-ABC123XYZ or AW-123456789." };
  if (googleTagIds.length > MAX_GOOGLE_TAGS) return { error: `Add up to ${MAX_GOOGLE_TAGS} Google tags.` };
  if (!googleTagIds.every(id => GOOGLE_ID.test(id))) return { error: "One of the Google tag IDs isn't valid." };
  return { value: { metaPixelId, googleTagIds } };
}

export async function getTracking(): Promise<TrackingSettings> {
  const db = await addressDb();
  const [rows] = await db.execute<(RowDataPacket & { value: unknown })[]>("SELECT value FROM kalacar_settings WHERE name=?", [ROW]);
  const raw = rows[0]?.value;
  if (raw === undefined) return DEFAULT_TRACKING;
  const parsed = parseTracking(typeof raw === "string" ? JSON.parse(raw) as unknown : raw);
  return "value" in parsed ? parsed.value : DEFAULT_TRACKING;
}

export async function saveTracking(value: TrackingSettings) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_settings (name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [ROW, JSON.stringify(value)]);
}
