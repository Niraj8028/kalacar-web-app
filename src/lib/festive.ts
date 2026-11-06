import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";
import { DEFAULT_FESTIVE, FESTIVE_OVERLAYS } from "@/data/site-content";
import type { FestiveSettings } from "@/data/site-content";

// Which festival decoration the shop shows, set in dashboard Settings.
const ROW = "festive";

export function parseFestive(input: unknown): FestiveSettings | null {
  const overlay = (input as { overlay?: unknown } | null | undefined)?.overlay;
  return FESTIVE_OVERLAYS.find(item => item === overlay) ? { overlay: overlay as FestiveSettings["overlay"] } : null;
}

export async function getFestive(): Promise<FestiveSettings> {
  const db = await addressDb();
  const [rows] = await db.execute<(RowDataPacket & { value: unknown })[]>("SELECT value FROM kalacar_settings WHERE name=?", [ROW]);
  const raw = rows[0]?.value;
  const value = (typeof raw === "string" ? JSON.parse(raw) : raw) as { diwali?: unknown } | undefined;
  // Early test saves stored only an on/off value for Diwali.
  if (value?.diwali === true) return { overlay: "diwali" };
  return parseFestive(value) ?? DEFAULT_FESTIVE;
}

export async function saveFestive(value: FestiveSettings) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_settings (name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [ROW, JSON.stringify(value)]);
}
