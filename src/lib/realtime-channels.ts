// Who may listen to what. No imports, so it can be tested alone.
export const SHOP_CHANNEL = "shop";
export const OWNER_CHANNEL = "private-owner";
export const customerChannel = (customerId: string) => `private-customer-${customerId}`;
/** Sent as event names only, with an empty message: pages reload from Kalacar's own server. */
export type Topic = "orders" | "products" | "store" | "coupons" | "settings" | "inquiries";

/** Anonymous, so a product page can show how many people are really viewing it. Nothing is sent on it. */
export const viewersChannel = (productId: string) => `presence-product-${productId}`;
export const isViewersChannel = (channel: string) => /^presence-product-[a-z0-9-]{1,64}$/.test(channel);
export const ownerMayJoin = (channel: string) => channel === OWNER_CHANNEL;
export const customerMayJoin = (channel: string, customerId: string) => channel === customerChannel(customerId);
