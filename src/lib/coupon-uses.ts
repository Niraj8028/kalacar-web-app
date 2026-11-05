// How coupon uses are counted. No imports, so these rules can be tested alone.
// Used: payment succeeded (a refund doesn't give the use back).
// Reserved: the order is unpaid and can still be retried, so its use can't go to someone else.

export const USED_STATUSES = "('paid','paid_after_cancel','refunded')";
export const RESERVED_STATUSES = "('payment_pending','payment_failed')";

export function usageLimitError(limit: number | null, used: number, reserved: number) {
  if (limit === null || used + reserved < limit) return null;
  return used >= limit ? "This coupon has been fully used." : "This coupon's remaining uses are held for orders awaiting payment. Please try again later.";
}

export function oncePerCustomerError(used: number, reserved: number) {
  if (used > 0) return "You've already used this coupon.";
  return reserved > 0 ? "You have an unpaid order using this coupon. Retry that order from your bag or Account." : null;
}

export type CouponListStatus = "off" | "expired" | "scheduled" | "used_up" | "reserved" | "active";
export function limitStatus(limit: number | null, used: number, reserved: number): "used_up" | "reserved" | "active" {
  if (limit === null) return "active";
  if (used >= limit) return "used_up";
  return used + reserved >= limit ? "reserved" : "active";
}
