import { describe, expect, it } from "vitest";
import { productPath, slugify } from "@/lib/permalinks";
import { DEFAULT_SEO, parseSeo } from "@/lib/seo";

describe("product permalinks", () => {
  it("turns a product name into its web address", () => {
    expect(slugify("Shree Krushna")).toBe("shree-krushna");
    expect(slugify("  Ganesh (Gold) — 3 inch ")).toBe("ganesh-gold-3-inch");
    expect(slugify("Sāī Bābā")).toBe("sai-baba");
    expect(slugify("श्री गणेश")).toBe("");
    expect(slugify("a".repeat(100))).toHaveLength(80);
  });
  it("links to the slug, or the id for products saved before permalinks", () => {
    expect(productPath({ id: "krushna", slug: "shree-krushna" })).toBe("/products/shree-krushna");
    expect(productPath({ id: "krushna" })).toBe("/products/krushna");
  });
});

describe("website title and icon", () => {
  it("keeps the built-in text when a field is empty and only accepts this site's photos", () => {
    expect(parseSeo({ title: "  ", description: "", favicon: "https://evil.example/x.png" })).toEqual(DEFAULT_SEO);
    expect(parseSeo({ title: " Kalacar   murtis ", description: "Small murtis", favicon: "/uploads/icon.png" })).toEqual({ title: "Kalacar murtis", description: "Small murtis", favicon: "/uploads/icon.png", showOnGoogle: true });
    expect(parseSeo({ favicon: "/uploads/../secret" }).favicon).toBe("");
    expect(parseSeo(null)).toEqual(DEFAULT_SEO);
  });
});
