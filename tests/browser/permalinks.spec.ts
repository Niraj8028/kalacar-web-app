import { expect, test } from "@playwright/test";
import { PRODUCTS, mockShop } from "./mock-shop";

// Product links use the address that follows the product name; the old id address still opens the product.
const RENAMED = PRODUCTS.map(item => item.id === "krushna" ? { ...item, name: "Shree Krushna", slug: "shree-krushna" } : item);

test("product cards link to the product's permalink, and it opens the product", async ({ page }) => {
  await mockShop(page, { products: RENAMED });
  await page.goto("/");
  const link = page.locator("a.card-link", { hasText: "Shree Krushna" }).first();
  await expect(link).toHaveAttribute("href", "/products/shree-krushna");
  await page.goto("/products/shree-krushna");
  await expect(page.getByRole("heading", { level: 1, name: "Shree Krushna" })).toBeVisible();
});

test("an address from before the rename still shows the product", async ({ page }) => {
  await mockShop(page, { products: RENAMED });
  await page.goto("/products/krushna");
  await expect(page.getByRole("heading", { level: 1, name: "Shree Krushna" })).toBeVisible();
});

test("every page has a favicon and the website title", async ({ page }) => {
  await mockShop(page);
  await page.goto("/");
  await expect(page).toHaveTitle(/Kalacar/);
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /favicon\.ico/);
  expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
});
