import { expect, test, type Page } from "@playwright/test";
import { mockShop } from "./mock-shop";

// Unpaid orders: customers can cancel one, and changing the bag cancels the old one instead of blocking checkout.
const USER = { id: "u1", name: "Test Buyer", email: "buyer@example.test", phone: "9876543210" };
const ADDRESS = { id: "a1", isDefault: true, label: "Home", fullName: "Test Buyer", phone: "9876543210", address: "1 Temple Road", city: "Pune", state: "Maharashtra", landmark: "", instructions: "", pincode: "411001" };
const OLD_ORDER = "11111111-1111-4111-8111-111111111111";
const NEW_ORDER = "22222222-2222-4222-8222-222222222222";

/** A signed-in buyer with a bag, an earlier unpaid order saved in this browser, and a fake Razorpay. */
async function setup(page: Page, cancelStatus: string) {
  await mockShop(page, { user: USER });
  const calls: string[] = [];
  await page.route("**/api/account/addresses", route => route.fulfill({ json: { addresses: [ADDRESS] } }));
  await page.route("**/api/account/orders/*/*", route => {
    const path = new URL(route.request().url()).pathname;
    calls.push(path);
    if (path.endsWith("/cancel")) return route.fulfill({ json: { status: cancelStatus } });
    return route.fulfill({ json: { status: "payment_pending" } });
  });
  await page.route("**/api/checkout/orders", route => { calls.push("/api/checkout/orders"); return route.fulfill({ json: { orderId: NEW_ORDER, razorpayOrderId: "order_new", amount: 99900, currency: "INR", keyId: "rzp_test_x" } }); });
  await page.route("https://checkout.razorpay.com/**", route => route.fulfill({ contentType: "text/javascript", body: "window.Razorpay = class { constructor(o) { window.__opened = o.order_id; } on() {} open() {} };" }));
  await page.addInitScript(([oldOrder]) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.setItem("kalacar-demo-cart-v1", JSON.stringify([{ id: "ganesh", variantId: "plain", quantity: 1 }]));
    // Saved for a different bag (Krushna), so the Ganesh bag counts as changed.
    localStorage.setItem("kalacar.pending-checkout.v1", JSON.stringify({ fingerprint: JSON.stringify({ items: [{ id: "krushna", variantId: "gold", quantity: 1 }] }), idempotencyKey: "33333333-3333-4333-8333-333333333333", orderId: oldOrder, razorpayOrderId: "order_old", amount: 99900 }));
  }, [OLD_ORDER]);
  await page.goto("/cart");
  await expect(page.getByText(`Unpaid order ${OLD_ORDER.slice(0, 8).toUpperCase()}`)).toBeVisible();
  return calls;
}

test("a customer can cancel an unpaid order from the bag", async ({ page }) => {
  const calls = await setup(page, "cancelled");
  page.once("dialog", dialog => void dialog.accept());
  await page.getByRole("button", { name: "Cancel order" }).click();
  await expect(page.getByText(/was cancelled and nothing was charged/)).toBeVisible();
  await expect(page.getByText(`Unpaid order ${OLD_ORDER.slice(0, 8).toUpperCase()}`)).toBeHidden();
  expect(calls).toContain(`/api/account/orders/${OLD_ORDER}/cancel`);
  expect(await page.evaluate(() => localStorage.getItem("kalacar.pending-checkout.v1"))).toBeNull();
});

test("paying for a changed bag cancels the old unpaid order and opens payment for the new one", async ({ page }) => {
  const calls = await setup(page, "cancelled");
  await page.getByRole("button", { name: /^Pay / }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __opened?: string }).__opened)).toBe("order_new");
  expect(calls.indexOf(`/api/account/orders/${OLD_ORDER}/cancel`)).toBeLessThan(calls.indexOf("/api/checkout/orders"));
  await expect(page.getByText(/already have an unpaid order/)).toBeHidden();
});

test("an old order that turns out to be paid is not replaced by a new one", async ({ page }) => {
  const calls = await setup(page, "paid");
  await page.route(`**/api/account/orders/${OLD_ORDER}/sync`, route => route.fulfill({ json: { status: "paid" } }));
  await page.getByRole("button", { name: /^Pay / }).click();
  await expect(page.getByText(/Payment confirmed/)).toBeVisible();
  expect(calls).not.toContain("/api/checkout/orders");
});
