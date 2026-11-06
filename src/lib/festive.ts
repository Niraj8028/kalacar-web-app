import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";
import type { FestiveSettings } from "@/data/site-content";

// Seasonal decoration switch, set in dashboard Settings.
const ROW = "festive";

export async function getFestive(): Promise<FestiveSettings> {
  const db = await addressDb();
  const [rows] = await db.execute<(RowDataPacket & { value: unknown })[]>("SELECT value FROM kalacar_settings WHERE name=?", [ROW]);
  const raw = rows[0]?.value;
  const value = (typeof raw === "string" ? JSON.parse(raw) : raw) as { diwali?: unknown } | undefined;
  return { diwali: value?.diwali === true };
}

export async function saveFestive(value: FestiveSettings) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_settings (name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [ROW, JSON.stringify(value)]);
}
