import { describe, expect, it, vi } from "vitest";
import { DEFAULT_HOME, DEFAULT_PRODUCT_PAGE, reviewSummary, videoEmbed } from "@/data/site-content";
import { PAGE_DEFAULTS } from "@/data/page-defaults";

vi.mock("@/lib/catalogue-db", () => ({ addressDb: vi.fn(), listProducts: vi.fn() }));

describe("page content is cleaned", () => {
  it("removes anything that could run code", async () => {
    const { cleanPageHtml: clean } = await import("@/lib/pages");
    expect(clean('<p onclick="x()">Hi</p><script>alert(1)</script>')).toBe("<p>Hi</p>");
    expect(clean('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript");
    expect(clean('<a href="//evil.com">x</a>')).not.toContain("evil.com");
    expect(clean('<img src=x onerror="a()"><iframe src="https://evil.com"></iframe><style>p{}</style>')).toBe("");
  });
  it("keeps normal formatting and links", async () => {
    const { cleanPageHtml: clean } = await import("@/lib/pages");
    expect(clean("<h2>A</h2><ul><li><strong>B</strong></li></ul>")).toBe("<h2>A</h2><ul><li><strong>B</strong></li></ul>");
    expect(clean('<a href="https://kalacar.in" target="_blank">x</a>')).toContain('rel="noopener noreferrer"');
    expect(clean('<mark class="policy-confirm">x</mark>')).toContain("policy-confirm");
    expect(clean('<mark class="other">x</mark>')).not.toContain("other");
  });
  it("has a valid starting page for every slug, and only real links", async () => {
    const { cleanPageHtml: clean, defaultPage } = await import("@/lib/pages");
    for (const page of PAGE_DEFAULTS) {
      expect(defaultPage(page.slug)?.title).toBe(page.title);
      expect(page.seoDescription.length).toBeLessThanOrEqual(170);
      expect(clean(page.content).length).toBeGreaterThan(20);
    }
    expect(defaultPage("not-a-page")).toBeNull();
  });
  it("marks pages with undecided items as drafts", async () => {
    const { defaultPage } = await import("@/lib/pages");
    expect(defaultPage("privacy")?.draft).toBe(true);
  });
});

describe("contact form", () => {
  const good = { name: "Asha", email: "asha@example.test", phone: "+91 98765 43210", message: "Hello there" };
  it("accepts a real message and refuses bad ones", async () => {
    const { parseInquiry: parse } = await import("@/lib/pages");
    expect(parse(good)).toHaveProperty("value");
    expect(parse({ ...good, phone: "" })).toHaveProperty("value");
    expect(parse({ ...good, email: "nope" })).toHaveProperty("error");
    expect(parse({ ...good, phone: "abc" })).toHaveProperty("error");
    expect(parse({ ...good, name: "" })).toHaveProperty("error");
    expect(parse({ ...good, message: "hi" })).toHaveProperty("error");
    expect(parse({ ...good, message: "x".repeat(2001) })).toHaveProperty("error");
    expect(parse(null)).toHaveProperty("error");
  });
});

describe("home and product page settings", () => {
  it("falls back to defaults", async () => {
    const { parseHome, parseProductPage } = await import("@/lib/site-content");
    expect(parseHome(null)).toEqual(DEFAULT_HOME);
    expect(parseProductPage(undefined)).toEqual(DEFAULT_PRODUCT_PAGE);
    expect(parseHome("not an object")).toEqual(DEFAULT_HOME);
  });
  it("keeps saved choices, including switching things off", async () => {
    const { parseHome } = await import("@/lib/site-content");
    const home = parseHome({ hero: { show: false, showTitle: false, title: "New" }, firstLaunch: { show: true, productIds: ["a", "a", "BAD ID", "b"] }, comingSoon: { items: [{ name: "Soon", image: "/uploads/a.png" }, { name: "", image: "" }] } });
    expect(home.hero).toMatchObject({ show: false, showTitle: false, title: "New" });
    expect(home.firstLaunch.productIds).toEqual(["a", "b"]);
    expect(home.comingSoon.items).toEqual([{ name: "Soon", image: "/uploads/a.png" }]);
  });
  it("only accepts this site's photos and safe links", async () => {
    const { parseHome, safeImage, safeLink } = await import("@/lib/site-content");
    expect(safeImage("/uploads/a-1.png")).toBe("/uploads/a-1.png");
    for (const bad of ["https://evil.com/a.png", "/uploads/../x", "javascript:alert(1)", "/admin", 5]) expect(safeImage(bad)).toBe("");
    for (const good of ["#catalogue", "/about", "https://kalacar.in/x"]) expect(safeLink(good, "#")).toBe(good);
    for (const bad of ["javascript:alert(1)", "//evil.com", "http://evil.com", "/\\evil.com", "data:text/html,x"]) expect(safeLink(bad, "#")).toBe("#");
    expect(parseHome({ hero: { explore: { link: "javascript:alert(1)" } } }).hero.explore.link).toBe("#catalogue");
  });
  it("keeps numbers in range and has no made-up activity on by default", async () => {
    const { parseProductPage } = await import("@/lib/site-content");
    const page = parseProductPage({ viewers: { minimum: 9999 }, lowStock: { threshold: -1 } });
    expect(page.viewers.minimum).toBe(DEFAULT_PRODUCT_PAGE.viewers.minimum);
    expect(page.lowStock.threshold).toBe(DEFAULT_PRODUCT_PAGE.lowStock.threshold);
    expect(DEFAULT_PRODUCT_PAGE.viewers.show).toBe(false);
    expect(DEFAULT_PRODUCT_PAGE.recentSales.show).toBe(false);
    expect(DEFAULT_PRODUCT_PAGE.recentSales.showFirstName).toBe(false);
    expect(DEFAULT_PRODUCT_PAGE.soldThisWeek.show).toBe(false);
  });
});

describe("reviews", () => {
  const good = { author: "Asha", rating: 5, text: "Lovely" };
  it("checks each review", async () => {
    const { parseReview: parse } = await import("@/lib/site-content");
    expect(parse(good)).toHaveProperty("value");
    expect(parse({ ...good, author: "" })).toHaveProperty("error");
    expect(parse({ ...good, rating: 6 })).toHaveProperty("error");
    expect(parse({ ...good, rating: 0 })).toHaveProperty("error");
    expect(parse({ author: "Asha", rating: 5 })).toHaveProperty("error");
    expect(parse({ ...good, videoUrl: "https://evil.com/v" })).toHaveProperty("error");
    expect(parse({ ...good, productId: "BAD ID" })).toHaveProperty("error");
  });
  it("works out ratings from real reviews only", () => {
    expect(reviewSummary([])).toBeNull();
    expect(reviewSummary([{ rating: 5 }, { rating: 4 }])).toEqual({ count: 2, average: 4.5 });
  });
  it("makes safe video addresses from YouTube and Instagram links only", () => {
    expect(videoEmbed("https://www.youtube.com/watch?v=abc123DEF_-")?.src).toBe("https://www.youtube-nocookie.com/embed/abc123DEF_-");
    expect(videoEmbed("https://youtu.be/abc123DEF_-")?.kind).toBe("youtube");
    expect(videoEmbed("https://www.youtube.com/shorts/abc123DEF_-")?.kind).toBe("youtube");
    expect(videoEmbed("https://www.instagram.com/reel/ABC_123/")?.src).toBe("https://www.instagram.com/p/ABC_123/embed");
    for (const bad of ["http://youtube.com/watch?v=abc123DEF", "https://evil.com/watch?v=abc123DEF", "https://youtube.com.evil.com/watch?v=abc123DEF", "https://youtube.com/watch?v=<script>", "nope", ""]) expect(videoEmbed(bad)).toBeNull();
  });
});
