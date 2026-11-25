import { describe, expect, it } from "vitest";
import { buildOwnerOrderEmail, type OrderEmailData } from "@/lib/email-templates";
import { DEFAULT_TEMPLATES, fillMessage, orderMessageValues } from "@/lib/order-messages";
import { orderProofMessage } from "@/components/order-details";

const ORDER: OrderEmailData = {
  orderId: "abcdef12-3456-4789-8abc-def012345678", name: "Ravi Kumar", email: "ravi@example.com", phone: "98765 43210", address: "1 Temple Road\nPune", pincode: "411001",
  total: 699, placedAt: new Date("2026-11-25T02:03:00Z"), items: [{ name: "Cute Krishna", variant: "", price: 699, quantity: 1 }], giftWrapPrice: null, couponCode: "", discount: 0, viewLink: null,
};
const EXTRA = { status: "paid", reason: "", paymentTried: true, whatsapp: "Hi Ravi, thank you", whatsappLink: "https://wa.me/919876543210?text=Hi%20Ravi", dashboardLink: "https://admin.kalacar.in/orders/abcdef12-3456-4789-8abc-def012345678" };

describe("owner email settings", () => {
  it("takes a comma-separated list, trims, lowercases and drops repeats", async () => {
    const { parseOwnerEmails } = await import("@/lib/owner-emails");
    expect(parseOwnerEmails({ emails: " A@x.com, b@y.in ,a@x.com", paid: true, unpaid: false })).toEqual({ value: { emails: ["a@x.com", "b@y.in"], paid: true, unpaid: false } });
    expect(parseOwnerEmails({ emails: ["a@x.com"] })).toEqual({ value: { emails: ["a@x.com"], paid: true, unpaid: true } });
    expect(parseOwnerEmails({ emails: "" })).toEqual({ value: { emails: [], paid: true, unpaid: true } });
  });
  it("refuses a typo instead of dropping it, and too many addresses", async () => {
    const { parseOwnerEmails, MAX_OWNER_EMAILS } = await import("@/lib/owner-emails");
    expect(parseOwnerEmails({ emails: "a@x.com, notanemail" })).toHaveProperty("error");
    expect(parseOwnerEmails({ emails: "a@x" })).toHaveProperty("error");
    expect(parseOwnerEmails({ emails: Array.from({ length: MAX_OWNER_EMAILS + 1 }, (_, i) => `o${i}@x.com`) })).toHaveProperty("error");
  });
  it("opens WhatsApp for Indian numbers with or without 0 or +91", async () => {
    const { whatsappDigits } = await import("@/lib/owner-emails");
    expect(whatsappDigits("98765 43210")).toBe("919876543210");
    expect(whatsappDigits("098765-43210")).toBe("919876543210");
    expect(whatsappDigits("+91 98765 43210")).toBe("919876543210");
    expect(whatsappDigits("12345")).toBe("");
  });
});

describe("owner order email", () => {
  it("paid: customer, address, items, total and the WhatsApp message with its button", () => {
    const email = buildOwnerOrderEmail("paid", ORDER, EXTRA);
    expect(email.subject).toBe("New paid order: ₹699 · Ravi Kumar · ABCDEF12");
    for (const part of ["New order from Ravi Kumar", "Paid. Ready to prepare.", "98765 43210", "ravi@example.com", "1 Temple Road", "PIN 411001", "Cute Krishna × 1", "Total paid: ₹699", "Hi Ravi, thank you", "Send on WhatsApp: https://wa.me/919876543210"]) expect(email.text).toContain(part);
    expect(email.html).toContain('href="https://wa.me/919876543210?text=Hi%20Ravi"');
    expect(email.html).toContain('href="tel:9876543210"');
    expect(email.html).not.toContain("Questions? WhatsApp us");
  });
  it("unpaid: says why, and whether a payment was tried", () => {
    const email = buildOwnerOrderEmail("unpaid", ORDER, { ...EXTRA, status: "cancelled", reason: "Not paid within 1 hour" });
    expect(email.subject).toBe("Unpaid order: ₹699 · Ravi Kumar · ABCDEF12");
    expect(email.text).toContain("Not paid (a payment was tried and failed). Not paid within 1 hour.");
    expect(email.text).toContain("Order total: ₹699");
  });
  it("escapes what the customer typed", () => {
    const email = buildOwnerOrderEmail("paid", { ...ORDER, name: "<b>x</b>" }, EXTRA);
    expect(email.html).not.toContain("<b>x</b>");
  });
  it("without a WhatsApp number, asks to copy the message", () => {
    expect(buildOwnerOrderEmail("paid", ORDER, { ...EXTRA, whatsappLink: "" }).html).toContain("can't open in WhatsApp");
  });
});

describe("message for the customer", () => {
  it("fills the not-paid template with the order", () => {
    const values = orderMessageValues({ id: ORDER.orderId, customerName: "Ravi Kumar", total: 699, items: [{ name: "Cute Krishna", variant: "Standard", quantity: 1 }] }, "Not paid");
    expect(fillMessage(DEFAULT_TEMPLATES.unpaid.whatsapp, values)).toBe("Hi Ravi, this is Kalacar. We saw you tried to order Cute Krishna x 1 (₹699), but the payment didn't go through. Would you like to complete your order? Reply here and we'll help you.");
    expect(fillMessage("{first_name} {customer_name}", { first_name: "{customer_name}", customer_name: "R" })).toBe("{customer_name} R");
  });
});

describe("order details proof message", () => {
  it("has the order number, items, amount, status and payment ID", () => {
    const text = orderProofMessage({ id: ORDER.orderId, status: "paid", createdAt: "2026-11-25T02:03:00Z", amount: 699, phone: "9876543210", address: "", pincode: "", paymentId: "pay_ABC", items: [{ name: "Cute Krishna", price: 699, quantity: 1 }] });
    expect(text).toContain("I placed order ABCDEF12 on 25 Nov 2026");
    expect(text).toContain("Items: Cute Krishna x 1");
    expect(text).toContain("Total paid: ₹699 · Status: Paid");
    expect(text).toContain("Payment ID: pay_ABC");
    expect(orderProofMessage({ id: ORDER.orderId, status: "payment_failed", createdAt: "2026-11-25T02:03:00Z", amount: 699, address: "", pincode: "", paymentId: "pay_X", items: [] })).not.toContain("Payment ID");
  });
});
