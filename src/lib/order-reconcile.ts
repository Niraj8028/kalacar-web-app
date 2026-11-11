import { listExpiredUnpaidOrders, listOrdersToRecheck } from "@/lib/catalogue-db";
import { cancelIfUnpaid, syncOrderPayment } from "@/lib/order-payment-sync";

// Catches a payment that Kalacar never heard about, such as a customer closing the page right after
// paying. Razorpay advises checking its API as well as using webhooks. Runs at most once a minute.
const EVERY_MS = 60000;
let lastRun = 0;

export function recheckRecentPayments() {
  if (Date.now() - lastRun < EVERY_MS) return;
  lastRun = Date.now();
  void (async () => {
    try {
      const orders = await listOrdersToRecheck();
      for (const order of orders) {
        // One order's lookup failing mustn't stop the others.
        await syncOrderPayment(order, order.userId).catch(error => console.error("Payment recheck failed:", error instanceof Error ? error.message : "unknown error"));
      }
    } catch (error) { console.error("Payment recheck failed:", error instanceof Error ? error.message : "unknown error"); }
  })();
}

// Unpaid orders hold their murtis' stock. After this long they're cancelled so the stock goes back on sale.
export const UNPAID_ORDER_MINUTES = 60;
let lastExpiry = 0;

/** Cancels unpaid orders older than an hour. Runs on shop and dashboard traffic, at most every 2 minutes. */
export function expireUnpaidOrders() {
  if (Date.now() - lastExpiry < 2 * 60000) return;
  lastExpiry = Date.now();
  void (async () => {
    try {
      for (const order of await listExpiredUnpaidOrders(UNPAID_ORDER_MINUTES)) {
        await cancelIfUnpaid(order, order.userId, "Not paid within 1 hour").catch(error => console.error("Unpaid order expiry failed:", error instanceof Error ? error.message : "unknown error"));
      }
    } catch (error) { console.error("Unpaid order expiry failed:", error instanceof Error ? error.message : "unknown error"); }
  })();
}
