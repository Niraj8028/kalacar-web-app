import { describe, expect, it } from "vitest";
import { decidePayment } from "@/lib/razorpay-payments";
import { getPaymentStatus, razorpayKeys } from "@/lib/payment-status";

const ORDER = "order_1";
const pay = (over: object) => ({ id: "pay_1", order_id: ORDER, amount: 99900, currency: "INR", status: "captured", ...over });

describe("deciding what Razorpay's answer means", () => {
  it("treats a matching captured payment as paid", () => expect(decidePayment([pay({})], ORDER, 99900)).toEqual({ kind: "paid", paymentId: "pay_1" }));
  it("refuses a captured payment for the wrong amount", () => expect(decidePayment([pay({ amount: 100 })], ORDER, 99900).kind).toBe("mismatch"));
  it("refuses a captured payment in the wrong currency", () => expect(decidePayment([pay({ currency: "USD" })], ORDER, 99900).kind).toBe("mismatch"));
  it("ignores payments for another order", () => expect(decidePayment([pay({ order_id: "other" })], ORDER, 99900).kind).toBe("no_attempt"));
  it("reports no attempt when nothing was tried", () => expect(decidePayment([], ORDER, 99900).kind).toBe("no_attempt"));
  it("reports failed only when every attempt failed", () => {
    expect(decidePayment([pay({ status: "failed" })], ORDER, 99900).kind).toBe("failed");
    expect(decidePayment([pay({ status: "failed" }), pay({ id: "pay_2", status: "authorized" })], ORDER, 99900).kind).toBe("in_progress");
  });
  it("treats a later success after a failure as paid", () => expect(decidePayment([pay({ status: "failed" }), pay({ id: "pay_2" })], ORDER, 99900)).toEqual({ kind: "paid", paymentId: "pay_2" }));
});

describe("Razorpay status for Settings", () => {
  it("opens checkout with a test or live key and its secret", () => {
    expect(getPaymentStatus({ RAZORPAY_KEY_ID: "rzp_test_x", RAZORPAY_KEY_SECRET: "s" })).toMatchObject({ mode: "test", checkoutOpen: true });
    expect(getPaymentStatus({ RAZORPAY_KEY_ID: "rzp_test_x" })).toMatchObject({ mode: "test", checkoutOpen: false });
    expect(getPaymentStatus({ RAZORPAY_KEY_ID: "rzp_live_x", RAZORPAY_KEY_SECRET: "s" })).toMatchObject({ mode: "live", checkoutOpen: true });
    expect(getPaymentStatus({ RAZORPAY_KEY_ID: "rzp_live_x" })).toMatchObject({ mode: "live", checkoutOpen: false });
    expect(getPaymentStatus({})).toMatchObject({ mode: "unconfigured", checkoutOpen: false });
  });
  it("gives checkout the keys only when both are set and the key is a Razorpay one", () => {
    expect(razorpayKeys({ RAZORPAY_KEY_ID: "rzp_live_x", RAZORPAY_KEY_SECRET: "s" })).toEqual({ keyId: "rzp_live_x", secret: "s" });
    expect(razorpayKeys({ RAZORPAY_KEY_ID: "rzp_test_x", RAZORPAY_KEY_SECRET: "s" })).toEqual({ keyId: "rzp_test_x", secret: "s" });
    expect(razorpayKeys({ RAZORPAY_KEY_ID: "rzp_live_x" })).toBeNull();
    expect(razorpayKeys({ RAZORPAY_KEY_ID: "something_else", RAZORPAY_KEY_SECRET: "s" })).toBeNull();
  });
  it("never includes key or secret values", () => {
    const text = JSON.stringify(getPaymentStatus({ RAZORPAY_KEY_ID: "rzp_test_KEYVALUE", RAZORPAY_KEY_SECRET: "SECRETVALUE", RAZORPAY_WEBHOOK_SECRET: "HOOKVALUE" }));
    expect(text).not.toMatch(/KEYVALUE|SECRETVALUE|HOOKVALUE/);
  });
});
