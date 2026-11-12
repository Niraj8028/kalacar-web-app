import { expect, test } from "@playwright/test";
import { mockShop } from "./mock-shop";
import { DEFAULT_BRAND, DEFAULT_FESTIVE, DEFAULT_HOME, DEFAULT_INSTAGRAM, DEFAULT_PRODUCT_PAGE } from "../../src/data/site-content";

const content = (tracking: unknown) => ({ home: DEFAULT_HOME, productPage: DEFAULT_PRODUCT_PAGE, collections: [], instagram: DEFAULT_INSTAGRAM, festive: DEFAULT_FESTIVE, brand: DEFAULT_BRAND, tracking });

test("saved Meta Pixel and Google tags load on the shop, and Meta hears about page changes", async ({ page }) => {
  await mockShop(page, { content: content({ metaPixelId: "4436512496660507", googleTagIds: ["GTM-KZJ27PVT", "GTM-PMJWSM6Z"] }) });
  const loaded: string[] = [];
  await page.route(/connect\.facebook\.net|googletagmanager\.com/, route => { loaded.push(route.request().url()); return route.fulfill({ contentType: "text/javascript", body: "" }); });
  await page.goto("/");
  await expect.poll(() => loaded.length).toBe(3);
  expect(loaded.some(url => url.includes("fbevents.js"))).toBe(true);
  expect(loaded.filter(url => /gtm\.js\?id=GTM-(KZJ27PVT|PMJWSM6Z)$/.test(url))).toHaveLength(2);
  const queue = () => page.evaluate(() => (window as unknown as { fbq: { queue: unknown[][] } }).fbq.queue.map(args => args.join(" ")));
  expect(await queue()).toEqual(["init 4436512496660507", "track PageView"]);
  // Moving to another page inside the shop (no reload) counts as a new page view; the tags aren't loaded twice.
  await page.locator("footer").getByRole("link", { name: "About Kalacar" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect.poll(queue).toEqual(["init 4436512496660507", "track PageView", "track PageView"]);
  expect(loaded).toHaveLength(3);
});

test("no tags load when none are saved", async ({ page }) => {
  await mockShop(page, { content: content({ metaPixelId: "", googleTagIds: [] }) });
  const loaded: string[] = [];
  await page.route(/connect\.facebook\.net|googletagmanager\.com/, route => { loaded.push(route.request().url()); return route.fulfill({ contentType: "text/javascript", body: "" }); });
  await page.goto("/");
  await expect(page.locator("main").first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(loaded).toEqual([]);
  expect(await page.evaluate(() => "fbq" in window)).toBe(false);
});
