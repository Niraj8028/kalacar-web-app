import { expect, test } from "@playwright/test";
import { mockShop } from "./mock-shop";

const ORDER = "66666666-6666-4666-8666-666666666666";
const PAID = { id: ORDER, createdAt: "2026-11-25T02:03:00Z", amount: 699, status: "paid", fulfillmentStatus: "unfulfilled", address: "1 Temple Road", pincode: "411001", email: "ravi@example.test", phone: "9876543210", paymentId: "pay_TEST123", items: [{ id: "krushna", name: "Cute Krishna", price: 699, quantity: 1 }] };

test("the thank-you page moves to the order's details, which has a WhatsApp proof button", async ({ page }) => {
  await mockShop(page, { orders: [PAID] });
  await page.goto(`/order-confirmed?order=${ORDER}`);
  await expect(page.getByText("Thank you, your order is confirmed")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/order-details\\?order=${ORDER}$`), { timeout: 10000 });
  await expect(page.getByRole("heading", { name: "Order 66666666" })).toBeVisible();
  await expect(page.getByText("Payment ID pay_TEST123")).toBeVisible();
  const href = await page.getByRole("link", { name: /Send order details on WhatsApp/ }).getAttribute("href");
  const text = decodeURIComponent(new URL(href!).searchParams.get("text") ?? "");
  expect(href).toMatch(/^https:\/\/wa\.me\/919561579131\?text=/);
  expect(text).toContain("I placed order 66666666");
  expect(text).toContain("Total paid: ₹699 · Status: Paid");
  expect(text).toContain("Payment ID: pay_TEST123");
  // Going back or refreshing the thank-you page lands here, so the purchase can't be counted again.
  await page.goto(`/order-confirmed?order=${ORDER}`);
  await expect(page).toHaveURL(new RegExp(`/order-details\\?order=${ORDER}$`));
  await expect(page.getByText("Thank you, your order is confirmed")).toHaveCount(0);
});

test("an unpaid order shows its status and no payment ID", async ({ page }) => {
  await mockShop(page, { orders: [{ ...PAID, status: "payment_failed" }] });
  await page.goto(`/order-details?order=${ORDER}`);
  await expect(page.getByText("Payment failed", { exact: true })).toBeVisible();
  await expect(page.getByText(/Payment ID/)).toHaveCount(0);
  await expect(page.getByText("Order total")).toBeVisible();
});

test("an order this browser can't see isn't shown", async ({ page }) => {
  await mockShop(page, { orders: [] });
  await page.goto(`/order-details?order=${ORDER}`);
  await expect(page.getByRole("heading", { name: "We couldn't find this order" })).toBeVisible();
  await page.goto("/order-details");
  await expect(page.getByRole("heading", { name: "We couldn't find this order" })).toBeVisible();
});
