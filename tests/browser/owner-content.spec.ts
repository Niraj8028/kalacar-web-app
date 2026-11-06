import { expect, test } from "@playwright/test";
import { DEFAULT_HOME, DEFAULT_PRODUCT_PAGE } from "../../src/data/site-content";
import { expectFits, mockShop, PRODUCTS, watchErrors } from "./mock-shop";

const review = (over: object) => ({ id: 1, productId: "ganesh", author: "Real Buyer", city: "Pune", rating: 4, text: "Lovely finish", photos: [], videoUrl: "", showOnHome: true, published: true, ...over });
const content = (home: object = {}, productPage: object = {}) => ({ home: { ...DEFAULT_HOME, ...home }, productPage: { ...DEFAULT_PRODUCT_PAGE, ...productPage }, collections: [{ name: "Ganesh", image: "", productCount: 1 }, { name: "Krishna", image: "", productCount: 1 }] });
const hero = { ...DEFAULT_HOME.hero, title: "Owner Title", description: "Owner text" };

test.describe("home page follows the dashboard", () => {
  test("shows the owner's hero", async ({ page }) => {
    const errors = watchErrors(page);
    await mockShop(page, { content: content({ hero: { ...hero, productId: "ganesh", buy: { show: true, label: "Buy today", showPrice: true } } }) });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Owner Title" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Buy today · ₹999/ })).toBeVisible();
    await expectFits(page);
    expect(errors).toEqual([]);
  });
  test("defaults keep the page working if settings can't load", async ({ page }) => {
    await mockShop(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: DEFAULT_HOME.hero.title })).toBeVisible();
    await expect(page.locator(".result-count")).toHaveText("3 items");
  });
  test("each checkbox hides its part", async ({ page }) => {
    await mockShop(page, { content: content({ hero: { ...hero, showDescription: false, buy: { ...hero.buy, show: false }, explore: { ...hero.explore, show: false } } }) });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Owner Title" })).toBeVisible();
    await expect(page.getByText("Owner text")).toHaveCount(0);
    await expect(page.locator(".home-hero-explore")).toHaveCount(0);
  });
  test("Buy now with one colour adds to the bag and opens it", async ({ page }) => {
    await mockShop(page, { content: content({ hero: { ...hero, productId: "ganesh" } }) });
    await page.goto("/");
    await page.locator(".home-hero-buy").click();
    await expect(page.getByRole("dialog").or(page.locator(".cart-drawer")).first()).toBeVisible();
    expect(await page.evaluate(() => JSON.stringify(window.localStorage))).toContain("ganesh");
    await expect(page).toHaveURL(/\/$/);
  });
  test("Buy now with several colours asks first, and stays on the page", async ({ page }) => {
    const krushna = PRODUCTS[0];
    const twoInStock = { ...krushna, variants: [...krushna.variants, { ...krushna.variants[0], id: "rose", name: "Rose" }] };
    await mockShop(page, { products: [twoInStock, ...PRODUCTS.slice(1)], content: content({ hero: { ...hero, productId: "krushna" } }) });
    await page.goto("/");
    await page.locator(".home-hero-buy").click();
    const dialog = page.getByRole("dialog", { name: /Choose a colour/ });
    await expect(dialog.getByRole("button", { name: /White/ })).toBeDisabled();
    await dialog.getByRole("button", { name: /Gold/ }).click();
    expect(await page.evaluate(() => JSON.stringify(window.localStorage))).toContain("gold");
    await expect(page).toHaveURL(/\/$/);
  });
  test("First launch and Coming Soon show what was chosen, with no price on upcoming murtis", async ({ page }) => {
    await mockShop(page, { content: content({ hero, firstLaunch: { ...DEFAULT_HOME.firstLaunch, show: true, productIds: ["ganesh"] }, comingSoon: { ...DEFAULT_HOME.comingSoon, show: true, items: [{ name: "Upcoming Hanuman", image: "" }] } }) });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Our First Launch" })).toBeVisible();
    const soon = page.locator("section", { has: page.getByRole("heading", { name: "Coming Soon" }) });
    await expect(soon.getByText("Upcoming Hanuman")).toBeVisible();
    await expect(soon.getByText("Coming Soon", { exact: true }).last()).toBeVisible();
    await expect(soon.getByText("₹")).toHaveCount(0);
    await expect(soon.getByRole("button")).toHaveCount(0);
  });
  test("Collections are circles, 2 per row on phones, and filter the catalogue", async ({ page }, info) => {
    await mockShop(page, { content: content({ hero, collections: { ...DEFAULT_HOME.collections, show: true } }) });
    await page.goto("/");
    const links = page.locator(".home-collections a");
    await expect(links).toHaveCount(2);
    if (info.project.name === "phone") {
      const [first, second] = [await links.nth(0).boundingBox(), await links.nth(1).boundingBox()];
      expect(first?.y).toBe(second?.y);
    }
    await links.nth(0).click();
    await expect(page.locator(".result-count")).toHaveText("1 item");
  });
  test("Why us, reviews and Our Story appear only when filled in", async ({ page }) => {
    const on = { hero, why: { ...DEFAULT_HOME.why, show: true, items: [{ title: "Reason one", text: "Because" }] }, reviews: { ...DEFAULT_HOME.reviews, show: true }, story: { ...DEFAULT_HOME.story, show: true, text: "Our real story", founder: "Founder Name" } };
    await mockShop(page, { content: content(on), reviews: [review({})] });
    await page.goto("/");
    await expect(page.getByText("Reason one")).toBeVisible();
    await expect(page.getByText("Lovely finish")).toBeVisible();
    await expect(page.getByText("Our real story")).toBeVisible();
    await expectFits(page);
  });
  test("no newsletter section", async ({ page }) => {
    await mockShop(page);
    await page.goto("/");
    await expect(page.getByText(/newsletter|subscribe/i)).toHaveCount(0);
  });
});

test.describe("product page follows the dashboard", () => {
  test("shows description, offer, how it's made, FAQs and WhatsApp", async ({ page }) => {
    const errors = watchErrors(page);
    const products = PRODUCTS.map(item => item.id === "ganesh" ? { ...item, description: "A long product description." } : item);
    await mockShop(page, { products, content: content({}, { offer: { show: true, title: "Offer", text: "₹200 off above ₹1,500" }, howMade: { ...DEFAULT_PRODUCT_PAGE.howMade, show: true, message: "Founder message" }, faqs: { show: true, title: "FAQs", items: [{ question: "Is it fragile?", answer: "Handle with care." }] } }) });
    await page.goto("/products/ganesh");
    await expect(page.getByText("A long product description.")).toBeVisible();
    await expect(page.getByText("₹200 off above ₹1,500")).toBeVisible();
    await expect(page.getByText("Founder message")).toBeVisible();
    await expect(page.getByText("Is it fragile?")).toBeVisible();
    await expect(page.getByRole("link", { name: /WhatsApp/ })).toBeVisible();
    await expectFits(page);
    expect(errors).toEqual([]);
  });
  test("stars and count come only from real reviews", async ({ page }) => {
    await mockShop(page, { content: content(), reviews: [review({}), review({ id: 2, rating: 5, text: "Great", author: "Second Buyer" }), review({ id: 3, productId: "krushna", rating: 1 })] });
    await page.goto("/products/ganesh");
    await expect(page.locator(".detail-copy .rating-line")).toContainText("4.5 (2 reviews)");
    await page.goto("/products/soldout");
    await expect(page.locator(".rating-line")).toHaveCount(0);
  });
  test("low stock message uses the real number", async ({ page }) => {
    await mockShop(page, { content: content({}, { lowStock: { threshold: 10, text: "Hurry! Only {count} left" } }) });
    await page.goto("/products/ganesh");
    await expect(page.getByText("Hurry! Only 8 left")).toBeVisible();
  });
  test("real figures appear only when turned on and above the minimum", async ({ page }) => {
    const proof = { recent: [{ productId: "ganesh", productName: "Test Ganesh", hoursAgo: 3, firstName: "" }], soldThisWeek: { ganesh: 5, krushna: 1 } };
    await mockShop(page, { proof, content: content({}, { soldThisWeek: { show: true, minimum: 3 } }) });
    await page.goto("/products/ganesh");
    await expect(page.getByText("5 sold this week")).toBeVisible();
    await page.goto("/products/krushna");
    await expect(page.getByText(/sold this week/)).toHaveCount(0);
  });
  test("no made-up viewer count without live data", async ({ page }) => {
    await mockShop(page, { content: content({}, { viewers: { show: true, minimum: 2 } }) });
    await page.goto("/products/ganesh");
    await page.waitForTimeout(1000);
    await expect(page.getByText(/people are viewing/)).toHaveCount(0);
  });
  test("bundle adds everything to the bag", async ({ page }) => {
    const products = PRODUCTS.map(item => item.id === "ganesh" ? { ...item, bundleIds: ["krushna", "soldout"] } : item);
    await mockShop(page, { products, content: content() });
    await page.goto("/products/ganesh");
    const bundle = page.locator(".bundle-box");
    await expect(bundle).toContainText("Test Krushna");
    await expect(bundle).not.toContainText("Test Soldout");
    await bundle.getByRole("button", { name: /Add all to bag · ₹1,998/ }).click();
    const bag = await page.evaluate(() => JSON.stringify(window.localStorage));
    expect(bag).toContain("ganesh");
    expect(bag).toContain("krushna");
  });
  test("sticky bar appears after scrolling past the buttons, with an end link", async ({ page }) => {
    await mockShop(page, { content: content() });
    await page.goto("/products/ganesh");
    await expect(page.getByRole("heading", { name: "Test Ganesh" })).toBeVisible();
    await expect(page.locator(".sticky-buy-bar")).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator(".sticky-buy-bar")).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore more murtis" })).toBeVisible();
    await expectFits(page);
  });
});

test.describe("info pages", () => {
  test("Contact form sends a message, and ignores spam bots", async ({ page }) => {
    const state = await mockShop(page);
    await page.goto("/contact");
    await page.getByLabel("Name").fill("Asha");
    await page.getByLabel("Email").fill("asha@example.test");
    await page.getByLabel("Message").fill("Is this in stock?");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText(/We've received your message/)).toBeVisible();
    expect(state.contactBodies[0]).toMatchObject({ name: "Asha", website: "" });
  });
  for (const [path, heading] of [["/about", "About Kalacar"], ["/faq", "FAQs"], ["/contact", "Contact us"]] as const) {
    test(`${path} opens and fits`, async ({ page }) => {
      await mockShop(page);
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
      await expectFits(page);
    });
  }
  test("undecided pages show a draft notice and stay out of Google", async ({ page }) => {
    await mockShop(page);
    await page.goto("/privacy");
    await expect(page.locator(".policy-draft:visible")).toContainText("Draft, owner review");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
  test("footer links come from the dashboard", async ({ page }) => {
    await mockShop(page);
    await page.goto("/");
    await expect(page.locator(".shop-footer").getByRole("link", { name: "About Kalacar" })).toBeVisible();
    await expect(page.locator(".shop-footer").getByRole("link", { name: "Terms" })).toHaveCount(0);
  });
});
