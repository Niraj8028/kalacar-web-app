// What the owner can see about Razorpay. Yes/no answers only: key and secret values never leave the server.
export type PaymentMode = "test" | "live" | "unconfigured";
export type PaymentStatus = { mode: PaymentMode; secretSet: boolean; checkoutOpen: boolean; webhookSet: boolean };

type PaymentEnv = Partial<Record<"RAZORPAY_KEY_ID" | "RAZORPAY_KEY_SECRET" | "RAZORPAY_WEBHOOK_SECRET", string>>;

export function getPaymentStatus(env: PaymentEnv = process.env as PaymentEnv): PaymentStatus {
  const keyId = env.RAZORPAY_KEY_ID ?? "";
  const mode: PaymentMode = keyId.startsWith("rzp_test_") ? "test" : keyId.startsWith("rzp_live_") ? "live" : "unconfigured";
  return { mode, secretSet: Boolean(env.RAZORPAY_KEY_SECRET), checkoutOpen: razorpayKeys(env) !== null, webhookSet: Boolean(env.RAZORPAY_WEBHOOK_SECRET) };
}

/** The Razorpay key and secret that checkout uses, or null if either is missing or the key isn't a Razorpay one. Test and live keys both work. */
export function razorpayKeys(env: PaymentEnv = process.env as PaymentEnv): { keyId: string; secret: string } | null {
  const keyId = env.RAZORPAY_KEY_ID ?? "", secret = env.RAZORPAY_KEY_SECRET ?? "";
  return /^rzp_(test|live)_/.test(keyId) && secret ? { keyId, secret } : null;
}
