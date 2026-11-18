import { describe, expect, it } from "vitest";
import { gmailInbox, isEmail, normalEmail, sameInboxQuery } from "@/lib/email-address";
import { buildOrderEmail, buildSignInEmail, orderNumber, type OrderEmailData } from "@/lib/email-templates";

describe("matching a checkout email to an account", () => {
  it("treats Gmail dots and +tags as one inbox", () => {
    expect(gmailInbox("ravi.k+shop@gmail.com")).toBe("ravik");
    expect(gmailInbox("ravik@googlemail.com")).toBe("ravik");
  });
  it("leaves other providers alone", () => expect(gmailInbox("ravi.k@yahoo.com")).toBeNull());
  it("looks up other providers by the exact email only", () => expect(sameInboxQuery("ravi.k@yahoo.com")).toEqual({ where: "email=?", params: ["ravi.k@yahoo.com"] }));
  it("also looks up Gmail by inbox", () => expect(sameInboxQuery("ravi.k@gmail.com").params).toEqual(["ravi.k@gmail.com", "ravik"]));
  it("normalises and checks emails", () => {
    expect(normalEmail("  Ravi@Gmail.COM ")).toBe("ravi@gmail.com");
    expect(isEmail("ravi@gmail.com")).toBe(true);
    expect(isEmail("ravi@gmail")).toBe(false);
  });
});

const ORDER: OrderEmailData = {
  orderId: "abcdef12-3456-4789-8abc-def012345678", name: "Ravi Kumar", email: "ravi@gmail.com", phone: "9876543210",
  address: "1 Temple Road\nPune\nMaharashtra", pincode: "411001", total: 2148, placedAt: new Date("2026-11-18T10:00:00Z"),
  items: [{ name: "Krushna", variant: "Gold", price: 999, quantity: 2 }], giftWrapPrice: 150, couponCode: "", discount: 0,
  viewLink: "https://kalacar.in/account?signin=TOKEN",
};

describe("order confirmation email", () => {
  const email = buildOrderEmail(ORDER);
  it("names the order in the subject", () => expect(email.subject).toBe("Order ABCDEF12 confirmed – Kalacar"));
  it("lists the items, total, address and next steps", () => {
    for (const part of ["Krushna (Gold) × 2", "₹1,998", "Gift packaging", "Total paid: ₹2,148", "1 Temple Road", "PIN 411001", "What happens next", "We choose your murti", "12–17 business days"]) expect(email.text).toContain(part);
    expect(email.html).toContain("1 Temple Road<br>Pune");
  });
  it("links to the order", () => expect(email.html).toContain('href="https://kalacar.in/account?signin=TOKEN"'));
  it("leaves out the button when there is no link", () => expect(buildOrderEmail({ ...ORDER, viewLink: null }).html).not.toContain("View your order"));
  it("escapes what customers typed", () => {
    const html = buildOrderEmail({ ...ORDER, name: "<script>x</script>", address: "<img src=x onerror=alert(1)>" }).html;
    expect(html).not.toContain("<script>x");
    expect(html).not.toContain("<img src=x");
  });
  it("uses the short order number", () => expect(orderNumber(ORDER.orderId)).toBe("ABCDEF12"));
});

describe("sign-in link email", () => {
  it("carries the link and when it expires", () => {
    const email = buildSignInEmail("Ravi Kumar", "https://kalacar.in/account?signin=T", 30);
    expect(email.text).toContain("https://kalacar.in/account?signin=T");
    expect(email.text).toContain("30 minutes");
    expect(email.html).toContain("Namaste, Ravi");
  });
});
