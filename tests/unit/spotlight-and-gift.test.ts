import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/catalogue-db", () => ({ addressDb: vi.fn() }));
const { parseHome } = await import("@/lib/site-content");
const { giftWrapCharge } = await import("@/lib/settings");

describe("product spotlight setting", () => {
  it("is off by default, so the live home page doesn't change until the owner turns it on", () => {
    expect(parseHome({}).spotlight).toMatchObject({ show: false, productId: "", image: "", showLogo: true, whatsapp: { show: true } });
  });
  it("keeps the owner's choices and refuses unsafe photos and product ids", () => {
    const spot = parseHome({ spotlight: { show: true, title: "Bring home the divine", description: "Joy", productId: "shree-krushna", image: "/uploads/collage.png", showLogo: false, whatsapp: { show: false, label: "Order on WhatsApp" } } }).spotlight;
    expect(spot).toEqual({ show: true, showTitle: true, title: "Bring home the divine", showDescription: true, description: "Joy", productId: "shree-krushna", image: "/uploads/collage.png", showLogo: false, whatsapp: { show: false, label: "Order on WhatsApp" } });
    const bad = parseHome({ spotlight: { productId: "BAD ID", image: "https://evil.com/x.png", whatsapp: { label: "" } } }).spotlight;
    expect(bad).toMatchObject({ productId: "", image: "", whatsapp: { label: "Order on WhatsApp" } });
  });
});

describe("gift packaging charge", () => {
  it("is charged for every murti in the bag", () => {
    expect(giftWrapCharge(49, [{ quantity: 1 }])).toBe(49);
    expect(giftWrapCharge(49, [{ quantity: 1 }, { quantity: 1 }])).toBe(98);
    expect(giftWrapCharge(49, [{ quantity: 2 }, { quantity: 1 }])).toBe(147);
    expect(giftWrapCharge(0, [{ quantity: 3 }])).toBe(0);
  });
});
