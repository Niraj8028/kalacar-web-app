import { expect, test } from "@playwright/test";
import { expectFits, mockShop, watchErrors } from "./mock-shop";

test.describe("every customer page opens and fits", () => {
  for (const [path, heading] of [["/shipping", "Shipping"], ["/returns", "Returns and refunds"], ["/safe-transit", "Safe Transit Guarantee"], ["/privacy", "Privacy"], ["/terms", "Terms"], ["/cart", "Your bag"], ["/account", "Your orders, in one place."]] as const) {
    test(path, async ({ page }) => {
      const errors = watchErrors(page);
      await mockShop(page);
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await expectFits(page);
      expect(errors).toEqual([]);
    });
  }
});

test("home lists products, and the category filter works", async ({ page }) => {
  const errors = watchErrors(page);
  await mockShop(page);
  await page.goto("/");
  await expect(page.locator(".result-count")).toHaveText("3 items");
  await expect(page.getByText("Test Krushna").first()).toBeVisible();
  await expectFits(page);
  await page.getByRole("button", { name: "Ganesh", exact: true }).click();
  await expect(page.locator(".result-count")).toHaveText("1 item");
  await expect(page.getByText("Test Krushna")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("adding to the bag reaches the drawer and bag page", async ({ page }) => {
  const errors = watchErrors(page);
  await mockShop(page);
  await page.goto("/products/ganesh");
  await expect(page.getByRole("heading", { name: "Test Ganesh" })).toBeVisible();
  await page.getByRole("button", { name: /add to bag/i }).click();
  await expect(page.getByText(/in your bag/i).first()).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByText("Test Ganesh").first()).toBeVisible();
  await expect(page.getByText("Your bag is empty.")).toHaveCount(0);
  await expectFits(page);
  expect(errors).toEqual([]);
});

test("a bag survives a reload", async ({ page }) => {
  await mockShop(page);
  await page.goto("/products/ganesh");
  await page.getByRole("button", { name: /add to bag/i }).click();
  await page.reload();
  await page.goto("/cart");
  await expect(page.getByText("Test Ganesh").first()).toBeVisible();
});

test("a sold-out murti can't be bought", async ({ page }) => {
  await mockShop(page);
  await page.goto("/products/soldout");
  await expect(page.getByText("This murti is currently out of stock.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Out of stock" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Buy now" })).toBeDisabled();
});

test("a closed shop shows Coming soon", async ({ page }) => {
  await mockShop(page, { open: false });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Coming soon" })).toBeVisible();
  await expect(page.getByText("Back soon")).toBeVisible();
});

test("signed-in Account shows the customer's order", async ({ page }) => {
  const errors = watchErrors(page);
  await mockShop(page, {
    user: { id: "u1", name: "Test Buyer", email: "buyer@example.test", phone: "9876543210" },
    orders: [{ id: "ab12cd34-0000", createdAt: "2026-11-06T10:00:00.000Z", amount: 999, status: "paid", fulfillmentStatus: "dispatched", trackingCourier: "trackon", trackingId: "TEST123", address: "x", pincode: "411001", items: [{ id: "krushna", name: "Test Krushna", variant: "Gold", price: 999, quantity: 1 }] }],
  });
  await page.goto("/account");
  await expect(page.getByText("Test Krushna").first()).toBeVisible();
  await expect(page.getByText("TEST123").first()).toBeVisible();
  await expectFits(page);
  expect(errors).toEqual([]);
});

test.describe("no constant calling, and failures don't harm the page", () => {
  test("an idle page doesn't keep asking for products", async ({ page }) => {
    const state = await mockShop(page);
    await page.goto("/");
    await expect(page.locator(".result-count")).toHaveText("3 items");
    const afterLoad = state.productCalls;
    await page.waitForTimeout(8000);
    expect(state.productCalls).toBe(afterLoad); // the old code would have made 6 more
  });
  test("a hidden tab stays silent, and coming back reloads once", async ({ page }) => {
    const state = await mockShop(page);
    await page.goto("/");
    await expect(page.locator(".result-count")).toHaveText("3 items");
    const before = state.productCalls;
    const setVisibility = (value: string) => page.evaluate(next => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => next });
      document.dispatchEvent(new Event("visibilitychange"));
    }, value);
    await setVisibility("hidden");
    await page.waitForTimeout(1500);
    expect(state.productCalls).toBe(before);
    await setVisibility("visible");
    await expect.poll(() => state.productCalls).toBe(before + 1);
    await page.waitForTimeout(1500);
    expect(state.productCalls).toBe(before + 1);
  });
  test("a failed refresh keeps products on screen", async ({ page }) => {
    const state = await mockShop(page);
    await page.goto("/");
    await expect(page.locator(".result-count")).toHaveText("3 items");
    state.productsStatus = 503;
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect.poll(() => state.productCalls).toBeGreaterThan(1);
    await page.waitForTimeout(500);
    await expect(page.getByText("Test Krushna").first()).toBeVisible();
    await expect(page.locator(".empty-results")).toHaveCount(0);
  });
  test("first load failing explains itself", async ({ page }) => {
    await mockShop(page, { productsStatus: 503 });
    await page.goto("/");
    await expect(page.locator("#catalogue").getByText("Catalogue is temporarily unavailable.")).toBeVisible();
  });
  test("the page works when the live service can't load", async ({ page }) => {
    await mockShop(page);
    await page.route("**/api/realtime/config", route => route.abort());
    await page.goto("/");
    await expect(page.locator(".result-count")).toHaveText("3 items");
  });
});

test("phone header: logo, bag and menu; search, categories and account are in the menu", async ({ page }, info) => {
  test.skip(info.project.name !== "phone");
  await mockShop(page);
  await page.goto("/");
  const header = page.locator(".shop-header");
  for (const hidden of [".header-search", ".header-nav", ".header-tools .account-link", ".header-tools .theme-toggle"]) await expect(header.locator(hidden).first(), hidden).toBeHidden();
  await expect(header.locator(".bag-link")).toBeVisible();
  const menuButton = page.getByRole("button", { name: "Open menu" });
  const [bag, menu] = [await header.locator(".bag-link").boundingBox(), await menuButton.boundingBox()];
  expect(menu!.x, "menu sits right of the bag").toBeGreaterThan(bag!.x);
  await menuButton.click();
  const panel = page.getByRole("dialog", { name: "Menu" });
  await expect(panel.getByRole("link", { name: /Account & orders/ })).toBeVisible();
  await panel.getByRole("button", { name: "Ganesh" }).click();
  await expect(panel).toBeHidden();
  await expect(page.locator(".result-count")).toHaveText("1 item");
  await menuButton.click();
  await panel.getByRole("searchbox", { name: "Search murtis" }).fill("Krushna");
  await page.keyboard.press("Enter");
  await expect(page.locator(".filter-chip.active")).toHaveText("Ganesh");
  await page.locator(".filter-chip", { hasText: "All murtis" }).click();
  await expect(page.locator(".result-count")).toHaveText("1 item");
  await page.keyboard.press("Escape");
  await expectFits(page);
});

test("phone menu from another page filters the home catalogue", async ({ page }, info) => {
  test.skip(info.project.name !== "phone");
  await mockShop(page);
  await page.goto("/products/ganesh");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: "Krishna" }).click();
  await expect(page).toHaveURL(/\/#catalogue$/);
  await expect(page.locator(".filter-chip.active")).toHaveText("Krishna");
});

test("header icons all match", async ({ page }, info) => {
  await mockShop(page);
  await page.goto("/");
  // Phones show only the bag and the menu; computers show account, theme and bag.
  const tools = info.project.name === "phone" ? [".header-tools .bag-link", ".menu-button"] : [".header-tools .account-link", ".header-tools .theme-toggle", ".header-tools .bag-link"];
  for (const tool of tools) {
    const circle = page.locator(`.shop-header ${tool}`);
    const box = await circle.boundingBox();
    expect(Math.round(box?.width ?? 0), tool).toBe(40);
    expect(Math.round(box?.height ?? 0), tool).toBe(40);
    await expect(circle, tool).toHaveCSS("border-radius", /50%|999px/);
    const icon = await circle.locator("svg").first().boundingBox();
    expect(Math.round(icon?.width ?? 0), tool).toBe(18);
  }
});
