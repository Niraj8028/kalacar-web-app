import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";
import { DEFAULT_INSTAGRAM } from "@/data/site-content";
import type { InstagramSettings } from "@/data/site-content";

// The shop's Instagram account, set in dashboard Settings. Shown on the home page.
const ROW = "instagram";

/** Accepts a username, @username or a profile link, and keeps only the username, so the saved link can only open Instagram. */
export function parseInstagram(input: unknown): { error: string } | { value: InstagramSettings } {
  const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const raw = typeof body.username === "string" ? body.username.trim() : "";
  const username = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$|\?.*$/, "");
  if (username && !/^[A-Za-z0-9._]{1,30}$/.test(username)) return { error: "Enter a valid Instagram username, like kalacar.in" };
  const show = body.show === true;
  if (show && !username) return { error: "Enter the Instagram username before showing it." };
  return { value: { show, username } };
}

export async function getInstagram(): Promise<InstagramSettings> {
  const db = await addressDb();
  const [rows] = await db.execute<(RowDataPacket & { value: unknown })[]>("SELECT value FROM kalacar_settings WHERE name=?", [ROW]);
  const raw = rows[0]?.value;
  if (raw === undefined) return DEFAULT_INSTAGRAM;
  const parsed = parseInstagram(typeof raw === "string" ? JSON.parse(raw) as unknown : raw);
  return "value" in parsed ? parsed.value : DEFAULT_INSTAGRAM;
}

export async function saveInstagram(value: InstagramSettings) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_settings (name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [ROW, JSON.stringify(value)]);
}
