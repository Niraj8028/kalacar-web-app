import { findOrder, markOrderPaid, markOrderPaymentFailed } from "@/lib/catalogue-db";
import { decidePayment } from "@/lib/razorpay-payments";
import { razorpayKeys } from "@/lib/payment-status";
import type { PaymentDecision, RazorpayPayment } from "@/lib/razorpay-payments";

type SyncableOrder = { id: string; razorpayOrderId: string | null; amount: number };

/** Asks Razorpay for the order's real payments and records the result. Throws if Razorpay can't be reached. */
export async function syncOrderPayment(order: SyncableOrder & { razorpayOrderId: string }, customerId: string): Promise<{ decision: PaymentDecision; status: string }> {
  const keys = razorpayKeys();
  if (!keys) throw new Error("Payment status lookup is unavailable.");
  const { keyId, secret } = keys;
  const auth = Buffer.from(`${keyId}:${secret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(order.razorpayOrderId)}/payments`, { headers: { Authorization: `Basic ${auth}` }, signal: AbortSignal.timeout(12000), cache: "no-store" });
  const result = await response.json() as { items?: RazorpayPayment[] };
  if (!response.ok || !Array.isArray(result.items)) throw new Error("Razorpay status lookup failed.");
  const decision = decidePayment(result.items, order.razorpayOrderId, order.amount * 100);
  if (decision.kind === "paid") {
    await markOrderPaid(order.id, order.razorpayOrderId, decision.paymentId);
    return { decision, status: (await findOrder(order.id))?.status ?? "paid" };
  }
  if (decision.kind === "failed") {
    await markOrderPaymentFailed(order.id, customerId, decision.paymentId);
    return { decision, status: "payment_failed" };
  }
  return { decision, status: "payment_pending" };
}
