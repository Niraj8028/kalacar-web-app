// What the owner can see about Razorpay. Yes/no answers only: key and secret values never leave the server.
export type PaymentMode = "test" | "live" | "unconfigured";
export type PaymentStatus = { mode: PaymentMode; secretSet: boolean; checkoutOpen: boolean; webhookSet: boolean };

type PaymentEnv = Partial<Record<"RAZORPAY_KEY_ID" | "RAZORPAY_KEY_SECRET" | "RAZORPAY_WEBHOOK_SECRET", string>>;

export function getPaymentStatus(env: PaymentEnv = process.env as PaymentEnv): PaymentStatus {
  const keyId = env.RAZORPAY_KEY_ID ?? "";
  const mode: PaymentMode = keyId.startsWith("rzp_test_") ? "test" : keyId.startsWith("rzp_live_") ? "live" : "unconfigured";
  const secretSet = Boolean(env.RAZORPAY_KEY_SECRET);
  // Matches the checkout routes, which accept test keys only until live payments are approved.
  return { mode, secretSet, checkoutOpen: mode === "test" && secretSet, webhookSet: Boolean(env.RAZORPAY_WEBHOOK_SECRET) };
}
