import { expect, test } from "@playwright/test";
import { DEFAULT_HOME, DEFAULT_PRODUCT_PAGE } from "../../src/data/site-content";
import { expectFits, mockShop, PRODUCTS, watchErrors } from "./mock-shop";

const content = (spotlight: object) => ({ home: { ...DEFAULT_HOME, spotlight: { ...DEFAULT_HOME.spotlight, ...spotlight } }, productPage: DEFAULT_PRODUCT_PAGE, collections: [] });

test.describe("product spotlight", () => {
  test("hidden until the owner turns it on and picks a product", async ({ page }) => {
    await mockShop(page, { content: content({ show: false, productId: "ganesh" }) });
    await page.goto("/");
    await expect(page.locator(".spotlight")).toHaveCount(0);
  });
  test("shows the product's own name, price and stock, and Add to bag works", async ({ page }) => {
    const errors = watchErrors(page);
    await mockShop(page, { content: content({ show: true, title: "Bring home the divine", description: "Experience the joy", productId: "ganesh" }) });
    await page.goto("/");
    const spot = page.locator(".spotlight");
    await expect(spot.getByRole("heading", { name: "Bring home the divine" })).toBeVisible();
    await expect(spot.getByRole("heading", { name: "Test Ganesh" })).toBeVisible();
    await expect(spot.getByText("₹999")).toBeVisible();
    await expect(spot.getByText("(Save 23%)")).toBeVisible();
    await expect(spot.getByText("In stock")).toBeVisible();
    await expect(spot.getByRole("link", { name: /WhatsApp to order/ })).toHaveAttribute("href", /wa\.me\/918830646308\?text=.*Test%20Ganesh/);
    await expect(page.locator(".hero-arrow, .spotlight .hero-dots")).toHaveCount(0);
    await spot.getByRole("button", { name: /Add to bag/ }).click();
    expect(await page.evaluate(() => JSON.stringify(window.localStorage))).toContain("ganesh");
    await expectFits(page);
    expect(errors).toEqual([]);
  });
  test("a sold-out murti can't be bought from the spotlight", async ({ page }) => {
    await mockShop(page, { content: content({ show: true, productId: "soldout" }) });
    await page.goto("/");
    await expect(page.locator(".spotlight").getByText("Out of stock")).toBeVisible();
    await expect(page.locator(".spotlight").getByRole("button", { name: /Add to bag/ })).toBeDisabled();
  });
});

test("gift packaging is charged per murti", async ({ page }) => {
  await mockShop(page, { products: PRODUCTS });
  await page.route("**/api/settings", route => route.fulfill({ json: { giftWrap: { enabled: true, price: 49, title: "Gift-ready packaging", description: "" }, store: { open: true, previewing: false, comingSoonMessage: "", announcementEnabled: false, announcementText: "" } } }));
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("kalacar-demo-cart-v1", JSON.stringify([{ id: "krushna", variantId: "gold", quantity: 1 }, { id: "ganesh", variantId: "plain", quantity: 1 }])));
  await page.goto("/cart");
  await page.getByRole("checkbox", { name: /Gift-ready packaging/ }).first().check();
  await expect(page.getByText("+₹49 each").first()).toBeVisible();
  await expect(page.getByText("Gift-ready packaging × 2").first()).toBeVisible();
  await expect(page.getByText("₹98", { exact: true }).first()).toBeVisible();
});
