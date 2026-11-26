import { describe, expect, it } from "vitest";
import { parseSeo, siteOrigin } from "@/lib/seo";
import { displayName, jsonForScript, productJsonLd, productSeo, transitDays } from "@/lib/product-seo";

type Product = Parameters<typeof productSeo>[0];
const krishna = { id: "p1", slug: "cute-krishna-holding-bansuri", name: "CUTE KRISHNA HOLDING BANSURI", deity: "Krishna", tagline: "Bal Krishna with his flute", description: "", image: "/uploads/krishna.webp", gallery: ["/uploads/krishna.webp", "/uploads/krishna-2.webp"], imageAlt: "", price: 799, stock: 4 } as unknown as Product;

describe("Google visibility setting", () => {
  it("is on unless the owner turned it off", () => {
    expect(parseSeo({ title: "Kalacar" }).showOnGoogle).toBe(true);
    expect(parseSeo({}).showOnGoogle).toBe(true);
    expect(parseSeo({ showOnGoogle: false }).showOnGoogle).toBe(false);
  });
  it("uses kalacar.in when no site address is set", () => {
    const before = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(siteOrigin()).toBe("https://kalacar.in");
    process.env.NEXT_PUBLIC_SITE_URL = "https://kalacar.in/";
    expect(siteOrigin()).toBe("https://kalacar.in");
    process.env.NEXT_PUBLIC_SITE_URL = before;
  });
});

describe("product pages in Google", () => {
  it("title-cases names typed in capitals, and leaves others alone", () => {
    expect(displayName("CUTE KRISHNA HOLDING BANSURI")).toBe("Cute Krishna Holding Bansuri");
    expect(displayName("Bal Ganesh on Lotus")).toBe("Bal Ganesh on Lotus");
  });
  it("puts the deity, 'idol' and 'murti' in the title and description, with the price", () => {
    const seo = productSeo(krishna);
    expect(seo.title).toBe("Cute Krishna Holding Bansuri – Krishna Idol for Car Dashboard & Mandir | Kalacar");
    expect(seo.description).toContain("Bal Krishna with his flute.");
    expect(seo.description).toContain("Krishna murti");
    expect(seo.description).toContain("₹799");
    expect(seo.description.length).toBeLessThanOrEqual(160);
    expect(seo.url).toMatch(/\/products\/cute-krishna-holding-bansuri$/);
    expect(seo.image).toMatch(/^https:\/\/.+\/uploads\/krishna\.webp$/);
  });
  it("keeps long descriptions to Google's length", () => {
    const long = productSeo({ ...krishna, description: "word ".repeat(80) } as Product);
    expect(long.description.length).toBeLessThanOrEqual(160);
    expect(long.description.endsWith("…")).toBe(true);
  });
  it("gives Google the price, stock and photos", () => {
    const data = productJsonLd(krishna);
    expect(data.offers).toMatchObject({ priceCurrency: "INR", price: 799, availability: "https://schema.org/InStock" });
    expect(data.image).toHaveLength(2);
    expect(productJsonLd({ ...krishna, stock: 0 } as Product).offers.availability).toBe("https://schema.org/OutOfStock");
  });
  it("tells Google delivery is free across India, in the shop's delivery time", () => {
    expect(productJsonLd(krishna).offers).not.toHaveProperty("shippingDetails");
    const shipping = productJsonLd(krishna, "3–7 business days").offers.shippingDetails;
    expect(shipping).toMatchObject({ shippingRate: { value: 0, currency: "INR" }, shippingDestination: { addressCountry: "IN" }, deliveryTime: { transitTime: { minValue: 2, maxValue: 7 } } });
    expect(productJsonLd(krishna, "About a week").offers.shippingDetails).not.toHaveProperty("deliveryTime");
    expect([transitDays("5 to 9 days"), transitDays("10 days"), transitDays("9-3 days")]).toEqual([{ min: 5, max: 9 }, { min: 10, max: 10 }, null]);
  });
  it("can't break out of its script tag", () => {
    expect(jsonForScript({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});
