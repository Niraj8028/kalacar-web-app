import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";
import { currentCustomer } from "@/lib/customer-auth";
import { isOwnerEmail } from "@/lib/google-oauth";

// Whether the shop is open, and the banner shown across the top. Saved by the owner in Settings.
// With no saved setting the shop stays Live, so adding this feature changes nothing by itself.

export type StoreSettings = { mode: "live" | "coming_soon"; comingSoonMessage: string; announcementEnabled: boolean; announcementText: string };
export const STORE_DEFAULT: StoreSettings = { mode: "live", comingSoonMessage: "We're getting ready. Please check back soon.", announcementEnabled: false, announcementText: "" };
export const SHOP_CLOSED_MESSAGE = "The shop isn't open for orders yet. Please check back soon.";

export async function getStoreSettings(): Promise<StoreSettings> {
  const db = await addressDb();
  const [rows] = await db.execute<(RowDataPacket & { value: unknown })[]>("SELECT value FROM kalacar_settings WHERE name='store'");
  const raw = rows[0]?.value;
  return { ...STORE_DEFAULT, ...((typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<StoreSettings> | undefined ?? {}) };
}

export function parseStoreSettings(body: unknown): { error: string } | { value: StoreSettings } {
  if (!body || typeof body !== "object") return { error: "Invalid settings." };
  const input = body as Record<string, unknown>;
  if (input.mode !== "live" && input.mode !== "coming_soon") return { error: "Choose Live or Coming soon." };
  const comingSoonMessage = typeof input.comingSoonMessage === "string" ? input.comingSoonMessage.trim() : "";
  const announcementText = typeof input.announcementText === "string" ? input.announcementText.trim() : "";
  const announcementEnabled = input.announcementEnabled === true;
  if (comingSoonMessage.length < 2 || comingSoonMessage.length > 200) return { error: "Keep the coming soon message to 2–200 characters." };
  if (announcementText.length > 160) return { error: "Keep the banner message to 160 characters." };
  if (announcementEnabled && announcementText.length < 2) return { error: "Write a banner message, or turn the banner off." };
  return { value: { mode: input.mode, comingSoonMessage, announcementEnabled, announcementText } };
}

export async function saveStoreSettings(value: StoreSettings) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_settings (name,value) VALUES ('store',?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [JSON.stringify(value)]);
}

/** What this visitor may see. An owner-listed account signed in on the shop can preview a closed shop. */
export async function visitorStoreAccess() {
  const store = await getStoreSettings();
  if (store.mode === "live") return { store, closed: false, previewing: false };
  const customer = await currentCustomer().catch(() => null);
  const previewing = isOwnerEmail(customer?.email);
  return { store, closed: !previewing, previewing };
}
