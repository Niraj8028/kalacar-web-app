import { describe, expect, it } from "vitest";
import { deliveryWindow, shortDate } from "@/lib/delivery-dates";
import { mobileDigits, parseFeedback, parseLead } from "@/lib/checkout-leads";
import { parseProductPage } from "@/lib/site-content";

// 2026-12-01 is a Tuesday. Times are written in UTC; India is 5:30 ahead.
const at = (iso: string) => new Date(iso);

describe("delivery dates", () => {
  it("counts business days from today before the cut-off, skipping Sundays", () => {
    const window = deliveryWindow("3–7 business days", at("2026-12-01T05:00:00Z"), 14)!; // Tue 10:30 IST
    expect([shortDate(window.from), shortDate(window.to)]).toEqual(["Fri, 4 Dec", "Wed, 9 Dec"]);
  });
  it("starts from the next working day after the cut-off or on a Sunday", () => {
    const late = deliveryWindow("3–7 business days", at("2026-12-01T09:00:00Z"), 14)!; // Tue 14:30 IST
    expect(shortDate(late.from)).toBe("Sat, 5 Dec");
    const sunday = deliveryWindow("3–7 business days", at("2026-12-06T04:00:00Z"), 14)!; // Sun 09:30 IST
    expect([shortDate(sunday.from), shortDate(sunday.to)]).toEqual(["Thu, 10 Dec", "Tue, 15 Dec"]);
  });
  it("uses India's date, not the server's", () => {
    // 20:00 UTC Monday is 01:30 Tuesday in India.
    expect(shortDate(deliveryWindow("1 day", at("2026-11-30T20:00:00Z"), 14)!.from)).toBe("Wed, 2 Dec");
  });
  it("has no dates when the wording has no number", () => {
    expect(deliveryWindow("About a week", new Date(), 14)).toBeNull();
  });
});

describe("trust settings", () => {
  it("fills in defaults and keeps only known icons", () => {
    const page = parseProductPage({});
    expect(page.trustStrip.items.map(item => item.title)).toEqual(["Free delivery", "Breakage covered", "Photo before dispatch", "Secure payment"]);
    const custom = parseProductPage({ trustStrip: { show: true, items: [{ icon: "rocket", title: "Fast", text: "x" }, { icon: "gift", title: "" }, ...Array(6).fill({ icon: "gift", title: "Gift" })] } });
    expect(custom.trustStrip.items[0].icon).toBe("secure");
    expect(custom.trustStrip.items).toHaveLength(3);
  });
  it("hides a free gift with no name, and keeps the cut-off hour in range", () => {
    expect(parseProductPage({ freeGift: { show: true, name: "  " } }).freeGift.show).toBe(false);
    expect(parseProductPage({ freeGift: { show: true, name: "Blessing card" } }).freeGift).toEqual({ show: true, name: "Blessing card" });
    expect(parseProductPage({ deliveryDates: { show: true, cutoffHour: 30 } }).deliveryDates.cutoffHour).toBe(14);
  });
});

describe("checkout leads and leaving survey", () => {
  const id = "0b6f7e4c-6c1a-4d1e-9a51-2f6a5d6c1b2a";
  it("reads Indian mobile numbers in any common format", () => {
    expect(["+91 95615 79131", "09561579131", "9561579131", "919561579131"].map(mobileDigits)).toEqual(Array(4).fill("9561579131"));
    expect(mobileDigits("12345")).toBe("");
    expect(mobileDigits("1234567890")).toBe("");
  });
  it("needs a name, a mobile number and a bag", () => {
    expect(parseLead({ id, name: "Asha", phone: "95615 79131", items: [{ id: "p1", variantId: "v1", quantity: 1 }], email: "bad", pincode: "410502" })).toEqual({ value: { id, name: "Asha", phone: "9561579131", email: "", pincode: "410502", items: [{ id: "p1", variantId: "v1", quantity: 1 }] } });
    expect(parseLead({ id, name: "A", phone: "9561579131", items: [{ id: "p1", quantity: 1 }] })).toHaveProperty("error");
    expect(parseLead({ id: "x", name: "Asha", phone: "9561579131", items: [{ id: "p1", quantity: 1 }] })).toHaveProperty("error");
    expect(parseLead({ id, name: "Asha", phone: "9561579131", items: [{ id: "p1", quantity: 0 }] })).toHaveProperty("error");
  });
  it("keeps only known reasons", () => {
    expect(parseFeedback({ reasons: ["cod", "cod", "hack"], other: "", source: "payment" })).toEqual({ value: { leadId: null, reasons: ["cod"], other: "", source: "payment" } });
    expect(parseFeedback({ reasons: [], other: "" })).toHaveProperty("error");
  });
});
