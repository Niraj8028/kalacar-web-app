import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import webpush from "web-push";
import { addressDb } from "@/lib/catalogue-db";
import { isOwnerEmail } from "@/lib/google-oauth";

// New-order alerts that reach the owner with the dashboard closed. Messages carry no customer
// address or phone number, and a failed alert never affects the order.

const MAX_DEVICES = 30;
// Only the browsers' own push services, so a saved address can't make the server call anywhere else.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^[a-z0-9.-]+\.push\.apple\.com$/, /^[a-z0-9.-]+\.notify\.windows\.com$/, /^[a-z0-9.-]+\.push\.services\.mozilla\.com$/];

type StoredDevice = RowDataPacket & { endpoint_hash: string; endpoint: string; p256dh: string; auth: string; owner_email: string };
type AlertMessage = { title: string; body: string; path: string; tag: string };
export type PushDevice = { endpoint: string; keys: { p256dh: string; auth: string } };

const hashOf = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex");

function vapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY, privateKey = process.env.VAPID_PRIVATE_KEY, subject = process.env.VAPID_SUBJECT;
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}
export const pushPublicKey = () => vapid()?.publicKey ?? "";

export function parsePushDevice(input: unknown): PushDevice | null {
  const value = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const { endpoint, keys } = value ?? {};
  if (typeof endpoint !== "string" || endpoint.length > 1000 || typeof keys?.p256dh !== "string" || typeof keys.auth !== "string") return null;
  if (keys.p256dh.length > 200 || keys.auth.length > 100) return null;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.port || !PUSH_HOSTS.some(host => host.test(url.hostname))) return null;
  } catch { return null; }
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

export async function savePushDevice(device: PushDevice, ownerEmail: string) {
  const db = await addressDb();
  const [count] = await db.execute<(RowDataPacket & { total: number })[]>("SELECT COUNT(*) AS total FROM kalacar_push_devices WHERE owner_email=? AND endpoint_hash<>?", [ownerEmail, hashOf(device.endpoint)]);
  if (Number(count[0]?.total) >= MAX_DEVICES) return false;
  await db.execute("INSERT INTO kalacar_push_devices (endpoint_hash,endpoint,p256dh,auth,owner_email) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE endpoint=VALUES(endpoint),p256dh=VALUES(p256dh),auth=VALUES(auth),owner_email=VALUES(owner_email)", [hashOf(device.endpoint), device.endpoint, device.keys.p256dh, device.keys.auth, ownerEmail]);
  return true;
}

export async function removePushDevice(endpoint: string) {
  const db = await addressDb();
  await db.execute("DELETE FROM kalacar_push_devices WHERE endpoint_hash=?", [hashOf(endpoint)]);
}

async function send(devices: StoredDevice[], message: AlertMessage) {
  const keys = vapid();
  if (!keys) return 0;
  let delivered = 0;
  await Promise.all(devices.map(async device => {
    try {
      await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify(message), { vapidDetails: keys, TTL: 86400, urgency: "high", timeout: 10000 });
      delivered += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      // The browser no longer accepts alerts for this device.
      if (status === 404 || status === 410) await removePushDevice(device.endpoint).catch(() => undefined);
      else console.error("Owner push alert failed:", status ?? "no response");
    }
  }));
  return delivered;
}

export async function sendTestPush(endpoint: string, ownerEmail: string) {
  const db = await addressDb();
  const [devices] = await db.execute<StoredDevice[]>("SELECT * FROM kalacar_push_devices WHERE endpoint_hash=? AND owner_email=?", [hashOf(endpoint), ownerEmail]);
  return send(devices, { title: "Kalacar test alert", body: "New-order alerts are working on this device.", path: "/settings", tag: "kalacar-test-alert" });
}

export function orderAlertMessage(order: { id: string; amount: number; status: string }, items: { name: string; variant?: string | null; quantity: number }[]): AlertMessage {
  const lines = items.map(item => `${item.name}${item.variant && item.variant !== "Standard" ? ` (${item.variant})` : ""} x ${item.quantity}`).join(", ");
  const shown = lines.length > 120 ? `${lines.slice(0, 117)}...` : lines;
  const label = order.id.slice(0, 8).toUpperCase();
  const money = `₹${order.amount.toLocaleString("en-IN")}`;
  return order.status === "paid_after_cancel"
    ? { title: `Paid after cancel: ${money}`, body: `Order ${label} needs a refund decision. ${shown}`.trim(), path: `/orders/${order.id}`, tag: `kalacar-order-${order.id}` }
    : { title: `New paid order: ${money}`, body: `Order ${label}. ${shown}`.trim(), path: `/orders/${order.id}`, tag: `kalacar-order-${order.id}` };
}

/** Called once, when an order first becomes paid. Never throws, so it can't affect the payment. */
export async function alertNewPaidOrder(orderId: string) {
  try {
    if (!vapid()) return;
    const db = await addressDb();
    const [orders] = await db.execute<(RowDataPacket & { id: string; amount: number; status: string })[]>("SELECT id,amount,status FROM kalacar_orders WHERE id=?", [orderId]);
    if (!orders[0]) return;
    const [items] = await db.execute<(RowDataPacket & { name: string; variant: string | null; quantity: number })[]>("SELECT product_name AS name,variant_name AS variant,quantity FROM kalacar_order_items WHERE order_id=?", [orderId]);
    const [devices] = await db.query<StoredDevice[]>("SELECT * FROM kalacar_push_devices");
    await send(devices.filter(device => isOwnerEmail(device.owner_email)), orderAlertMessage({ id: orders[0].id, amount: Number(orders[0].amount), status: orders[0].status }, items));
  } catch (error) { console.error("Owner alert failed:", error instanceof Error ? error.message : "unknown error"); }
}
