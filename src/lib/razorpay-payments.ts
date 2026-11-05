// Decides what Razorpay's list of payments means for one order. No imports, so it can be tested alone.

export type RazorpayPayment = { id?: string; order_id?: string; amount?: number; currency?: string; status?: string };
export type PaymentDecision =
  | { kind: "paid"; paymentId: string }
  | { kind: "failed"; paymentId: string }
  | { kind: "no_attempt" }
  | { kind: "in_progress" }
  | { kind: "mismatch" };

/**
 * Retry is only safe for "failed" and "no_attempt". Any other payment on this Razorpay order
 * (authorized, created, refunded, or a captured payment for the wrong amount) must stop a retry.
 */
export function decidePayment(items: RazorpayPayment[], razorpayOrderId: string, amountInPaise: number): PaymentDecision {
  const forOrder = items.filter(payment => payment.order_id === razorpayOrderId);
  if (!forOrder.length) return { kind: "no_attempt" };
  const captured = forOrder.find(payment => payment.status === "captured" && payment.id);
  if (captured) {
    const matches = captured.amount === amountInPaise && captured.currency === "INR";
    return matches ? { kind: "paid", paymentId: captured.id! } : { kind: "mismatch" };
  }
  if (forOrder.every(payment => payment.status === "failed")) {
    const failed = forOrder.find(payment => payment.id);
    return failed ? { kind: "failed", paymentId: failed.id! } : { kind: "in_progress" };
  }
  return { kind: "in_progress" };
}
