import { expect, test } from "@playwright/test";
import { mockShop } from "./mock-shop";

// Guest checkout: no sign-in before paying, the order email is typed at checkout, and sign-in links work from email.
const ORDER = "44444444-4444-4444-8444-444444444444";
const PAID_ORDER = { id: ORDER, createdAt: "2026-11-18T10:00:00Z", amount: 999, status: "paid", fulfillmentStatus: "unfulfilled", address: "1 Temple Road", pincode: "411001", email: "guest@example.test", phone: "9876543210", items: [{ id: "ganesh", name: "Ganesh", price: 999, quantity: 1 }] };

test("a guest pays without signing in, and the email typed goes with the order", async ({ page }) => {
  await mockShop(page);
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/api/checkout/orders", route => { bodies.push(route.request().postDataJSON()); return route.fulfill({ json: { orderId: ORDER, razorpayOrderId: "order_guest", amount: 99900, currency: "INR", keyId: "rzp_test_x" } }); });
  await page.route("https://checkout.razorpay.com/**", route => route.fulfill({ contentType: "text/javascript", body: "window.Razorpay = class { constructor(o) { window.__prefill = o.prefill; } on() {} open() {} };" }));
  await page.addInitScript(() => localStorage.setItem("kalacar-demo-cart-v1", JSON.stringify([{ id: "ganesh", variantId: "plain", quantity: 1 }])));
  await page.goto("/cart");
  await expect(page.getByText("Sign in to continue")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText("Save this address for next time")).toHaveCount(0);
  await page.getByLabel("Email").fill("guest@example.test");
  await page.getByLabel("Full name").fill("Guest Buyer");
  await page.getByLabel("Mobile number").fill("9876543210");
  await page.getByLabel("Area, building and street").fill("1 Temple Road, Shivaji Nagar");
  await page.getByLabel("PIN code").fill("411001");
  await page.getByLabel("City").fill("Pune");
  await page.getByLabel("State").fill("Maharashtra");
  await page.getByRole("button", { name: /^Pay / }).click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0].email).toBe("guest@example.test");
  expect(bodies[0].saveAddress).toBe(false);
  expect(await page.evaluate(() => (window as unknown as { __prefill?: { email: string } }).__prefill?.email)).toBe("guest@example.test");
});

test("a guest's orders from this device show on Account, with a way to get a sign-in link", async ({ page }) => {
  await mockShop(page, { orders: [PAID_ORDER] });
  const asked: unknown[] = [];
  await page.route("**/api/auth/email-link", route => { asked.push(route.request().postDataJSON()); return route.fulfill({ json: { ok: true, message: "If that email has orders with us, a sign-in link is on its way. It expires in 30 minutes." } }); });
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Orders from this device" })).toBeVisible();
  await expect(page.getByText(`Order ${ORDER.slice(0, 8).toUpperCase()}`)).toBeVisible();
  await page.getByPlaceholder("The email you ordered with").fill("guest@example.test");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText(/a sign-in link is on its way/)).toBeVisible();
  expect(asked).toEqual([{ email: "guest@example.test", next: "/account" }]);
});

test("opening an emailed sign-in link signs in and clears the link from the address bar", async ({ page }) => {
  const state = await mockShop(page);
  const used: unknown[] = [];
  await page.route("**/api/auth/email-link", route => {
    used.push(route.request().postDataJSON());
    state.user = { id: "u9", name: "Guest Buyer", email: "guest@example.test", phone: "9876543210" };
    return route.fulfill({ json: { user: state.user } });
  });
  const token = "A".repeat(43);
  await page.goto(`/account?signin=${token}`);
  await expect(page.getByRole("heading", { name: "Namaste, Guest" })).toBeVisible();
  expect(used).toEqual([{ token }]);
  expect(new URL(page.url()).search).toBe("");
});

test("an expired sign-in link says so and offers a new one", async ({ page }) => {
  await mockShop(page);
  await page.route("**/api/auth/email-link", route => route.fulfill({ status: 410, json: { error: "This sign-in link has expired or was already used. Ask for a new one below." } }));
  await page.goto(`/account?signin=${"B".repeat(43)}`);
  await expect(page.getByText("This sign-in link has expired or was already used.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();
});
