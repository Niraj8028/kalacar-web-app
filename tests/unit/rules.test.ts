import { describe, expect, it, vi } from "vitest";
import { limitStatus, oncePerCustomerError, usageLimitError } from "@/lib/coupon-uses";
import { parseCartItems } from "@/lib/cart-items";
import { safeNextPath } from "@/lib/google-oauth";

vi.mock("@/lib/catalogue-db", () => ({ addressDb: vi.fn(), listProducts: vi.fn() }));

describe("coupon uses", () => {
  it("allows a coupon with uses left", () => expect(usageLimitError(5, 2, 1)).toBeNull());
  it("refuses a fully used coupon", () => expect(usageLimitError(2, 2, 0)).toMatch(/fully used/));
  it("holds uses reserved by unpaid orders", () => expect(usageLimitError(2, 1, 1)).toMatch(/held/));
  it("has no limit when none is set", () => expect(usageLimitError(null, 100, 100)).toBeNull());
  it("applies once per customer", () => {
    expect(oncePerCustomerError(1, 0)).toMatch(/already used/);
    expect(oncePerCustomerError(0, 1)).toMatch(/unpaid order/);
    expect(oncePerCustomerError(0, 0)).toBeNull();
  });
  it("labels status", () => {
    expect(limitStatus(2, 2, 0)).toBe("used_up");
    expect(limitStatus(2, 1, 1)).toBe("reserved");
    expect(limitStatus(2, 1, 0)).toBe("active");
    expect(limitStatus(null, 9, 9)).toBe("active");
  });
});

describe("message templates", () => {
  it("accepts valid text and refuses mistakes", async () => {
    const { parseMessageTemplate: parse } = await import("@/lib/order-messages");
    const base = { whatsapp: "Hi {first_name}", sms: "Hi {first_name}", emailSubject: "s", emailBody: "b" };
    expect(parse(base)).toHaveProperty("value");
    expect(parse({ ...base, sms: "Hi {nmae}" })).toHaveProperty("error");
    expect(parse({ ...base, sms: "x".repeat(321) })).toHaveProperty("error");
    expect(parse({ ...base, whatsapp: "Hi {first_name" })).toHaveProperty("error");
    expect(parse({ ...base, emailBody: "" })).toHaveProperty("error");
    expect(parse(null)).toHaveProperty("error");
  });
  it("ships default templates that pass their own rules", async () => {
    const { DEFAULT_TEMPLATES, MESSAGE_STATUSES, parseMessageTemplate } = await import("@/lib/order-messages");
    for (const status of MESSAGE_STATUSES) expect(parseMessageTemplate(DEFAULT_TEMPLATES[status])).toHaveProperty("value");
  });
});

describe("website link", () => {
  it("accepts web addresses only", async () => {
    const { parseShopLink: parse } = await import("@/lib/shop-link");
    expect(parse("https://kalacar.in")).toEqual({ value: "https://kalacar.in/" });
    expect(parse("http://localhost:3000")).toEqual({ value: "http://localhost:3000/" });
    expect(parse("")).toEqual({ value: "" });
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "http://kalacar.in", "kalacar.in", "https://u:p@kalacar.in", `https://${"a".repeat(200)}.in`]) expect(parse(bad)).toHaveProperty("error");
  });
});

describe("browser alerts", () => {
  const keys = { p256dh: "a", auth: "b" };
  it("accepts only the browsers' own push services", async () => {
    const { parsePushDevice: parse } = await import("@/lib/owner-alerts");
    for (const good of ["https://fcm.googleapis.com/fcm/send/x", "https://web.push.apple.com/x", "https://updates.push.services.mozilla.com/x"]) expect(parse({ endpoint: good, keys })).not.toBeNull();
    for (const bad of ["http://fcm.googleapis.com/x", "https://evil.com/x", "https://fcm.googleapis.com.evil.com/x", "https://localhost/x", "https://fcm.googleapis.com:8443/x"]) expect(parse({ endpoint: bad, keys })).toBeNull();
    expect(parse({ endpoint: "https://fcm.googleapis.com/x" })).toBeNull();
    expect(parse(null)).toBeNull();
  });
  it("puts no customer details in a message", async () => {
    const { orderAlertMessage } = await import("@/lib/owner-alerts");
    const message = orderAlertMessage({ id: "ab12cd34-1111", amount: 1299, status: "paid" }, [{ name: "Krushna", variant: "Gold", quantity: 1 }]);
    expect(message).toEqual({ title: "New paid order: ₹1,299", body: "Order AB12CD34. Krushna (Gold) x 1", path: "/orders/ab12cd34-1111", tag: "kalacar-order-ab12cd34-1111" });
    expect(orderAlertMessage({ id: "a", amount: 1, status: "paid_after_cancel" }, []).title).toMatch(/Paid after cancel/);
  });
});

describe("bag and sign-in input", () => {
  it("checks bag lines", () => {
    expect(parseCartItems([{ id: "a", quantity: 1 }])).toHaveProperty("items");
    expect(parseCartItems([])).toHaveProperty("error");
    expect(parseCartItems([{ id: "BAD ID", quantity: 1 }])).toHaveProperty("error");
    expect(parseCartItems([{ id: "a", quantity: 0 }])).toHaveProperty("error");
    expect(parseCartItems([{ id: "a", quantity: 1.5 }])).toHaveProperty("error");
    expect(parseCartItems([{ id: "a", quantity: 1 }, { id: "a", quantity: 1 }])).toHaveProperty("error");
  });
  it("only redirects within the site after sign-in", () => {
    expect(safeNextPath("/account")).toBe("/account");
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", null]) expect(safeNextPath(bad)).toBe("/");
  });
});
