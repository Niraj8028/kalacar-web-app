import { expect, test } from "@playwright/test";
import { mockShop, PRODUCTS } from "./mock-shop";

test("repeated highlights and specs all show, with no duplicate-key errors", async ({ page }) => {
  const keyErrors: string[] = [];
  page.on("console", message => { if (message.type() === "error" && /same key/i.test(message.text())) keyErrors.push(message.text()); });
  const repeated = { ...PRODUCTS[1], highlights: ["Hand finished", "Hand finished", "Hand finished"], specs: [{ label: "Height", value: "5 in" }, { label: "Height", value: "5 in" }] };
  await mockShop(page, { products: [PRODUCTS[0], repeated, PRODUCTS[2]] });
  await page.goto(`/products/${repeated.id}`);
  await expect(page.getByRole("list", { name: "Highlights" }).getByRole("listitem")).toHaveCount(3);
  await expect(page.locator(".spec-card")).toHaveCount(2);
  expect(keyErrors).toEqual([]);
});
