import { listOrdersToRecheck } from "@/lib/catalogue-db";
import { syncOrderPayment } from "@/lib/order-payment-sync";

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
