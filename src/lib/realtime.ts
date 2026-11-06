import type { RowDataPacket } from "mysql2/promise";
import Pusher from "pusher";
import { addressDb } from "@/lib/catalogue-db";
import { OWNER_CHANNEL, SHOP_CHANNEL, customerChannel } from "@/lib/realtime-channels";
import type { Topic } from "@/lib/realtime-channels";
import { forgetShopProducts } from "@/lib/shop-products";

// Tells open pages that something changed, after it's saved. A lost signal is never fatal: pages
// also reload on returning to the tab, on reconnecting, and on a slow timer. Signals carry no data.

let client: Pusher | null | undefined;
export function realtimeServer() {
  if (client !== undefined) return client;
  const { PUSHER_APP_ID: appId, PUSHER_KEY: key, PUSHER_SECRET: secret, PUSHER_CLUSTER: cluster } = process.env;
  client = appId && key && secret && cluster ? new Pusher({ appId, key, secret, cluster, useTLS: true, timeout: 3000 }) : null;
  return client;
}
export const realtimeConfig = () => {
  const { PUSHER_KEY: key, PUSHER_CLUSTER: cluster } = process.env;
  return realtimeServer() && key && cluster ? { key, cluster } : { key: null, cluster: null };
};

function send(channels: string[], topic: Topic) {
  const pusher = realtimeServer();
  if (!pusher) return;
  void pusher.trigger(channels, topic, {}).catch((error: unknown) => console.error("Realtime signal failed:", (error as { status?: number }).status ?? "no response"));
}

const WHO_HEARS: Record<Exclude<Topic, "orders">, string[]> = {
  products: [SHOP_CHANNEL, OWNER_CHANNEL],
  store: [SHOP_CHANNEL, OWNER_CHANNEL],
  coupons: [OWNER_CHANNEL],
  settings: [OWNER_CHANNEL],
};

export function announce(topic: Exclude<Topic, "orders">) {
  if (topic === "products") forgetShopProducts();
  send(WHO_HEARS[topic], topic);
}

/** The owner and that order's customer hear about it; nobody else does. */
export async function announceOrder(orderId: string, stockChanged = false) {
  try {
    if (stockChanged) announce("products");
    const db = await addressDb();
    const [rows] = await db.execute<(RowDataPacket & { user_id: string | null })[]>("SELECT user_id FROM kalacar_orders WHERE id=?", [orderId]);
    send(rows[0]?.user_id ? [OWNER_CHANNEL, customerChannel(rows[0].user_id)] : [OWNER_CHANNEL], "orders");
  } catch (error) { console.error("Realtime signal failed:", error instanceof Error ? error.message : "unknown error"); }
}

/** Wraps a saving route: signals only after it succeeded. */
export function signalled<Args extends unknown[]>(topics: Exclude<Topic, "orders">[], handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args) => {
    const response = await handler(...args);
    if (response.ok) topics.forEach(announce);
    return response;
  };
}
