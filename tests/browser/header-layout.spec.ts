import { expect, test } from "@playwright/test";
import { DEFAULT_HERO_SLIDE, DEFAULT_HOME, DEFAULT_PRODUCT_PAGE } from "../../src/data/site-content";
import { mockShop } from "./mock-shop";

const withPhoto = { home: { ...DEFAULT_HOME, hero: { ...DEFAULT_HOME.hero, slides: [{ ...DEFAULT_HERO_SLIDE, backgroundImage: "/uploads/a.png" }] } }, productPage: DEFAULT_PRODUCT_PAGE, collections: [] };

test("phones: white header stays at the top; the hero fills 95% of the screen below it", async ({ page }, info) => {
  test.skip(info.project.name !== "phone");
  await mockShop(page, { content: withPhoto });
  await page.goto("/");
  const header = page.locator(".shop-header");
  await expect(header).toHaveCSS("position", "sticky");
  await expect(header).toHaveCSS("background-color", "rgb(255, 253, 250)");
  // Wait for the owner's photo hero; before the settings load the page shows the plain default hero.
  await expect(page.locator(".home-hero.with-image")).toBeVisible();
  await expect.poll(() => page.evaluate(() => { const hero = document.querySelector(".home-hero")!.getBoundingClientRect(); return Math.round(Math.abs(hero.height - (innerHeight - hero.top) * 0.95)); })).toBeLessThan(3);
  await page.mouse.wheel(0, 1500);
  await expect.poll(() => header.evaluate(el => Math.round(el.getBoundingClientRect().top))).toBe(0);
  await page.goto("/products/ganesh");
  await page.mouse.wheel(0, 1200);
  await expect.poll(() => page.locator(".detail-header").evaluate(el => Math.round(el.getBoundingClientRect().top))).toBe(0);
});

test("computers: the account link is an icon only, with 'Your account' on hover", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await mockShop(page);
  for (const url of ["/", "/products/ganesh", "/cart"]) {
    await page.goto(url);
    const account = page.locator("header .account-link").first();
    await expect(account).toHaveAttribute("title", "Your account");
    expect(await account.locator("span").evaluate(el => el.getBoundingClientRect().width), url).toBeLessThanOrEqual(1);
    expect(Math.round((await account.boundingBox())!.width), url).toBe(40);
  }
});
