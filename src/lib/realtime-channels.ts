// Who may listen to what. No imports, so it can be tested alone.
export const SHOP_CHANNEL = "shop";
export const OWNER_CHANNEL = "private-owner";
export const customerChannel = (customerId: string) => `private-customer-${customerId}`;
/** Sent as event names only, with an empty message: pages reload from Kalacar's own server. */
export type Topic = "orders" | "products" | "store" | "coupons" | "settings";

export const ownerMayJoin = (channel: string) => channel === OWNER_CHANNEL;
export const customerMayJoin = (channel: string, customerId: string) => channel === customerChannel(customerId);
