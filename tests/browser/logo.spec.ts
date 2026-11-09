import { expect, test } from "@playwright/test";
import { DEFAULT_HOME, DEFAULT_PRODUCT_PAGE } from "../../src/data/site-content";
import { expectFits, mockShop, watchErrors } from "./mock-shop";

const content = () => ({ home: DEFAULT_HOME, productPage: DEFAULT_PRODUCT_PAGE, collections: [] });

test.describe("logo from dashboard Settings", () => {
  test("built-in logo stays white on the dark header", async ({ page }) => {
    await mockShop(page, { content: content() });
    await page.goto("/");
    const logo = page.locator(".shop-header .brand-logo");
    await expect(logo).toHaveAttribute("src", /kalakar-logo/);
    await expect(logo).not.toHaveClass(/own-colours/);
  });
  test("uploaded logo keeps its colours and uses the chosen width (70% on phones)", async ({ page }, info) => {
    const errors = watchErrors(page);
    await mockShop(page, { content: { ...content(), brand: { logo: "/uploads/my-logo.png", width: 220, white: false } } });
    await page.goto("/");
    const logo = page.locator(".shop-header .brand-logo");
    await expect(logo).toHaveClass(/own-colours/);
    expect(await logo.evaluate(element => getComputedStyle(element).filter)).not.toContain("invert");
    const width = await logo.evaluate(element => element.getBoundingClientRect().width);
    expect(Math.round(width)).toBe(info.project.name === "phone" ? 154 : 220);
    await expectFits(page);
    expect(errors).toEqual([]);
  });
  test("white option turns an uploaded logo white", async ({ page }) => {
    await mockShop(page, { content: { ...content(), brand: { logo: "/uploads/my-logo.png", width: 0, white: true } } });
    await page.goto("/");
    await expect(page.locator(".shop-header .brand-logo")).not.toHaveClass(/own-colours/);
  });
});
