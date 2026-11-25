// Orders whose thank-you page this browser has already shown. Opening that page again goes straight to
// the order's details, so a refresh can't be counted as another purchase by Meta or Google.
export const SEEN_ORDERS_COOKIE = "kalacar_seen_orders";
const KEEP = 5;

export const seenOrders = (cookie: string | undefined) => (cookie ?? "").split(".").filter(id => /^[0-9a-f-]{36}$/i.test(id));

/** Browser only. */
export function rememberSeenOrder(orderId: string) {
  try {
    const current = seenOrders(document.cookie.split("; ").find(part => part.startsWith(`${SEEN_ORDERS_COOKIE}=`))?.slice(SEEN_ORDERS_COOKIE.length + 1));
    const next = [...current.filter(id => id !== orderId), orderId].slice(-KEEP).join(".");
    document.cookie = `${SEEN_ORDERS_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  } catch { /* cookies blocked: the page still redirects itself */ }
}
