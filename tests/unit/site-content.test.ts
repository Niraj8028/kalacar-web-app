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
  it("starts every page finished, with no undecided items", async () => {
    const { defaultPage } = await import("@/lib/pages");
    for (const page of PAGE_DEFAULTS) {
      expect(defaultPage(page.slug)?.draft).toBe(false);
      expect(page.content).not.toContain("To confirm");
    }
  });
  it("gives saved pages still holding placeholders the finished text, and keeps real edits", async () => {
    const { addressDb } = await import("@/lib/catalogue-db");
    const { getPage } = await import("@/lib/pages");
    const row = (content: string) => ({ slug: "about", title: "Our Story", intro: "Old intro", content, seo_title: "", seo_description: "Old", published: 1, in_footer: 1 });
    const serve = (content: string) => vi.mocked(addressDb).mockResolvedValue({ execute: vi.fn().mockResolvedValue([[row(content)]]) } as never);
    serve('<h2>Our story</h2><p><mark class="policy-confirm">To confirm: the brand story.</mark></p>');
    const upgraded = await getPage("about");
    expect(upgraded).toMatchObject({ title: "Our Story", draft: false });
    expect(upgraded?.content).toContain("sister studio");
    expect(upgraded?.intro).not.toBe("Old intro");
    serve("<p>Our own words.</p>");
    expect(await getPage("about")).toMatchObject({ title: "Our Story", intro: "Old intro", content: "<p>Our own words.</p>" });
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
    expect(home.hero.show).toBe(false);
    expect(home.hero.slides).toHaveLength(1);
    expect(home.hero.slides[0]).toMatchObject({ showTitle: false, title: "New" });
    expect(home.firstLaunch.productIds).toEqual(["a", "b"]);
    expect(home.comingSoon.items).toEqual([{ name: "Soon", image: "/uploads/a.png" }]);
  });
  it("only accepts this site's photos and safe links", async () => {
    const { parseHome, safeImage, safeLink } = await import("@/lib/site-content");
    expect(safeImage("/uploads/a-1.png")).toBe("/uploads/a-1.png");
    for (const bad of ["https://evil.com/a.png", "/uploads/../x", "javascript:alert(1)", "/admin", 5]) expect(safeImage(bad)).toBe("");
    for (const good of ["#catalogue", "/about", "https://kalacar.in/x"]) expect(safeLink(good, "#")).toBe(good);
    for (const bad of ["javascript:alert(1)", "//evil.com", "http://evil.com", "/\\evil.com", "data:text/html,x"]) expect(safeLink(bad, "#")).toBe("#");
    expect(parseHome({ hero: { explore: { link: "javascript:alert(1)" } } }).hero.slides[0].explore.link).toBe("#catalogue");
    expect(parseHome({ hero: { slides: [{ backgroundImage: "https://evil.com/a.png", explore: { link: "//evil.com" } }] } }).hero.slides[0]).toMatchObject({ backgroundImage: "", explore: { link: "#catalogue" } });
  });
  it("reads hero slides, and older single-hero saves as one slide", async () => {
    const { parseHome } = await import("@/lib/site-content");
    const { MAX_HERO_SLIDES } = await import("@/data/site-content");
    const old = parseHome({ hero: { show: true, title: "Old hero", backgroundImage: "/uploads/old.png", productId: "krishna" } }).hero;
    expect(old).toMatchObject({ show: true, autoplay: true, interval: 5 });
    expect(old.slides).toHaveLength(1);
    expect(old.slides[0]).toMatchObject({ title: "Old hero", backgroundImage: "/uploads/old.png", productId: "krishna" });
    const many = parseHome({ hero: { show: true, autoplay: false, interval: 9, slides: [{ title: "One" }, { title: "Two", productId: "BAD ID" }] } }).hero;
    expect(many).toMatchObject({ autoplay: false, interval: 9 });
    expect(many.slides.map(slide => slide.title)).toEqual(["One", "Two"]);
    expect(many.slides[1].productId).toBe("");
    expect(parseHome({ hero: { slides: Array.from({ length: 20 }, (_, i) => ({ title: `S${i}` })) } }).hero.slides).toHaveLength(MAX_HERO_SLIDES);
    expect(parseHome({ hero: { slides: [] } }).hero.slides).toHaveLength(1);
    for (const interval of [0, 2, 16, 4.5, "7"]) expect(parseHome({ hero: { interval } }).hero.interval).toBe(5);
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
  it("keeps the owner's delivery wording and falls back when it's blank", async () => {
    const { parseProductPage } = await import("@/lib/site-content");
    expect(parseProductPage({ delivery: { estimate: "5–8 business days", note: "", free: { show: false, text: "Free shipping" } } }).delivery).toEqual({ estimate: "5–8 business days", note: "", free: { show: false, text: "Free shipping" } });
    expect(parseProductPage({ delivery: { estimate: "  ", free: { text: "" } } }).delivery).toEqual(DEFAULT_PRODUCT_PAGE.delivery);
    expect(DEFAULT_PRODUCT_PAGE.delivery).toMatchObject({ estimate: "3–7 business days", free: { show: true } });
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

describe("footer, why-choose icons and product eyebrow", () => {
  it("keeps the footer automatic until a list is saved, and drops unsafe or empty links", async () => {
    const { parseFooter } = await import("@/lib/site-content");
    expect(parseFooter(undefined)).toEqual({ text: "Prices and availability reflect the current catalogue.", showWhatsapp: true, links: null });
    const saved = parseFooter({ text: "  Made with devotion  ", showWhatsapp: false, links: [
      { label: "About", link: "/about" }, { label: "Insta", link: "https://instagram.com/kalacar" },
      { label: "Bad", link: "javascript:alert(1)" }, { label: "Bad 2", link: "//evil.com" }, { label: "", link: "/faq" },
    ] });
    expect(saved).toEqual({ text: "Made with devotion", showWhatsapp: false, links: [{ label: "About", link: "/about" }, { label: "Insta", link: "https://instagram.com/kalacar" }] });
    expect(parseFooter({ links: [] }).links).toEqual([]);
    expect(parseFooter({ text: "" }).text).toBe("");
  });
  it("keeps a reason's icon only if it is a photo stored by the shop", async () => {
    const { parseHome } = await import("@/lib/site-content");
    const why = parseHome({ why: { items: [{ title: "A", text: "x", icon: "/uploads/icon.png" }, { title: "B", text: "y", icon: "https://evil.com/x.png" }] } }).why;
    expect(why.items.map(item => item.icon)).toEqual(["/uploads/icon.png", ""]);
  });
  it("lets the owner change or hide the line above the product name", async () => {
    const { parseProductPage } = await import("@/lib/site-content");
    expect(parseProductPage({}).eyebrow).toEqual({ show: true, text: "{category} · SMALL DEVOTIONAL MURTI" });
    expect(parseProductPage({ eyebrow: { show: false, text: "Handpicked" } }).eyebrow).toEqual({ show: false, text: "Handpicked" });
  });
});
