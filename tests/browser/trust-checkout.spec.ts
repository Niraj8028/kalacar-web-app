import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_HOME, DEFAULT_PRODUCT_PAGE } from "../../src/data/site-content";
import { mockShop } from "./mock-shop";

// Trust and reassurance: trust strip, delivery dates, payment box, floating WhatsApp, saved checkouts and the leaving survey.
const content = (productPage: object = {}) => ({ home: DEFAULT_HOME, productPage: { ...DEFAULT_PRODUCT_PAGE, ...productPage }, collections: [] });
const ORDER = "55555555-5555-4555-8555-555555555555";

async function atCheckout(page: Page, productPage: object = {}, razorpay = "window.Razorpay = class { constructor(o) { window.__rzp = o; } on() {} open() { setTimeout(() => window.__rzp.modal.ondismiss(), 50); } };") {
  await mockShop(page, { content: content(productPage) });
  const leads: Record<string, unknown>[] = [], feedback: Record<string, unknown>[] = [];
  await page.route("**/api/checkout/lead", route => { leads.push(route.request().postDataJSON()); return route.fulfill({ json: { ok: true } }); });
  await page.route("**/api/checkout/feedback", route => { feedback.push(route.request().postDataJSON()); return route.fulfill({ json: { ok: true } }); });
  await page.route("**/api/checkout/orders", route => route.fulfill({ json: { orderId: ORDER, razorpayOrderId: "order_x", amount: 99900, currency: "INR", keyId: "rzp_test_x" } }));
  await page.route("**/api/checkout/orders/**", route => route.fulfill({ json: { status: "payment_pending" } }));
  await page.route("https://checkout.razorpay.com/**", route => route.fulfill({ contentType: "text/javascript", body: razorpay }));
  await page.addInitScript(() => localStorage.setItem("kalacar-demo-cart-v1", JSON.stringify([{ id: "ganesh", variantId: "plain", quantity: 1 }])));
  return { leads, feedback };
}

async function fillAddress(page: Page) {
  await page.getByLabel("Full name").fill("Asha Patil");
  await page.getByLabel("Mobile number").fill("98765 43210");
  await page.getByLabel("Area, building and street").fill("1 Temple Road, Shivaji Nagar");
  await page.getByLabel("PIN code").fill("411001");
  await page.getByLabel("City").fill("Pune");
  await page.getByLabel("State").fill("Maharashtra");
  await page.getByLabel("Email").fill("asha@example.test");
}

test("product page: trust strip, Buy now with UPI, delivery dates and a WhatsApp button naming the murti", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-12-01T05:00:00Z"));
  await mockShop(page, { content: content() });
  await page.addInitScript(() => { (window as unknown as { __opened: string[] }).__opened = []; window.open = (url?: string | URL) => { (window as unknown as { __opened: string[] }).__opened.push(String(url)); return null; }; });
  await page.goto("/products/ganesh");
  const strip = page.locator(".detail-copy .trust-strip");
  await expect(strip.locator("li b")).toHaveText(["Free delivery", "Breakage covered", "Photo before dispatch", "Secure payment"]);
  await expect(page.locator(".detail-copy").getByRole("button", { name: /Buy now/ })).toContainText("UPI");
  await expect(page.locator(".delivery-line .delivery-dates")).toHaveText("Fri, 4 Dec – Wed, 9 Dec");
  await page.getByRole("button", { name: "Chat with us on WhatsApp" }).click();
  expect(decodeURIComponent((await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened))[0])).toContain("question about Test Ganesh");
});

test("the WhatsApp button can be turned off, and the strip can be hidden", async ({ page }) => {
  await mockShop(page, { content: content({ whatsappFloat: { show: false, label: "" }, trustStrip: { show: false, items: [] } }) });
  await page.goto("/products/ganesh");
  await expect(page.locator(".detail-copy h1")).toBeVisible();
  await expect(page.getByRole("button", { name: "Chat with us on WhatsApp" })).toHaveCount(0);
  await expect(page.locator(".trust-strip")).toHaveCount(0);
});

test("bag: free delivery row, taxes included, and the trust line above checkout", async ({ page }) => {
  await mockShop(page, { content: content() });
  await page.addInitScript(() => localStorage.setItem("kalacar-demo-cart-v1", JSON.stringify([{ id: "ganesh", variantId: "plain", quantity: 1 }])));
  await page.goto("/cart");
  const totals = page.locator(".bag-page-side .bag-totals");
  await expect(totals.locator(".free-row")).toHaveText(["DeliveryFREE"]);
  await expect(totals.getByText("Inclusive of all taxes")).toBeVisible();
  await expect(page.locator(".bag-page-side .trust-line")).toContainText("Breakage covered");
});

test("every new line uses the owner's words and icons, and each can be hidden", async ({ page }) => {
  await atCheckout(page, {
    buyNow: { label: "Order now", icon: "star", showMarks: false, marks: "" },
    payButton: { label: "Complete payment of {total}", icon: "none" },
    secureCheckout: { show: false, icon: "secure", label: "", info: "" },
    paymentBox: { show: true, icon: "check", title: "Safe payments", marks: "UPI, RuPay", note: "" },
    bagTrust: { showLine: false, delivery: { show: true, label: "Shipping", value: "Free" }, taxNote: { show: false, text: "" }, youSave: { show: true, text: "" } },
    deliveryDates: { show: true, cutoffHour: 14, text: "Pahunchega {from} se {to} tak.", note: "" },
  });
  await page.goto("/products/ganesh");
  const buy = page.locator(".detail-copy").getByRole("button", { name: "Order now" });
  await expect(buy).toBeVisible();
  await expect(buy.locator(".payment-marks")).toHaveCount(0);
  await expect(page.locator(".delivery-line")).toContainText("Pahunchega");
  await page.goto("/checkout");
  await expect(page.getByRole("button", { name: /^Complete payment of ₹999$/ })).toBeVisible();
  await expect(page.locator(".secure-checkout")).toHaveCount(0);
  await expect(page.locator(".payment-box")).toContainText("Safe payments");
  await expect(page.locator(".payment-box .payment-marks span")).toHaveText(["UPI", "RuPay"]);
  await expect(page.locator(".bag-page-side .bag-totals .free-row")).toHaveText(["ShippingFree"]);
  await expect(page.locator(".tax-note")).toHaveCount(0);
});

test("checkout: name and mobile come first, the checkout is saved once they're typed, and payment is explained", async ({ page }) => {
  const { leads } = await atCheckout(page);
  await page.goto("/checkout");
  const form = page.locator("form.bag-checkout");
  await expect(page.getByLabel("Email")).toBeVisible();
  const labels = await form.locator("label").allTextContents();
  expect(labels.findIndex(text => text.startsWith("Mobile number"))).toBeLessThan(labels.findIndex(text => text.startsWith("Email")));
  await page.getByLabel("Full name").fill("Asha Patil");
  await page.getByLabel("Mobile number").fill("+91 98765 43210");
  await expect.poll(() => leads.length).toBe(1);
  expect(leads[0]).toMatchObject({ name: "Asha Patil", phone: "9876543210", items: [{ id: "ganesh", variantId: "plain", quantity: 1 }] });
  await expect(page.locator(".secure-checkout-label")).toHaveText("Secure checkout");
  await page.getByRole("button", { name: "How we protect your payment" }).click();
  await expect(page.getByText(/never see or store your card or UPI details, and we don't sell/)).toBeVisible();
  await expect(page.locator(".payment-box")).toContainText("Pay securely with Razorpay");
  await expect(page.getByRole("button", { name: /^Pay ₹999 securely$/ })).toBeVisible();
});

test("closing the payment window asks why, once per visit, and sends the answer", async ({ page }) => {
  const { feedback } = await atCheckout(page);
  await page.goto("/checkout");
  await fillAddress(page);
  await page.getByRole("button", { name: /^Pay / }).click();
  const survey = page.getByRole("dialog", { name: "Before you go" });
  await expect(survey).toBeVisible();
  await survey.getByLabel("I want Cash on Delivery").check();
  await survey.getByLabel("I have a question first").check();
  // The big contact box comes before the questions.
  await expect(survey.getByRole("heading", { name: "Talk to a real person" })).toBeVisible();
  await expect(survey.getByRole("link", { name: "Chat on WhatsApp" })).toHaveAttribute("href", /wa\.me\/919561579131\?text=/);
  await expect(survey.getByRole("link", { name: "Call us" })).toHaveAttribute("href", "tel:+919561579131");
  await survey.getByRole("button", { name: "Continue checkout", exact: true }).click();
  await expect(survey).toHaveCount(0);
  await expect.poll(() => feedback.length).toBe(1);
  expect(feedback[0]).toMatchObject({ reasons: ["cod", "question"], source: "payment" });
  expect(typeof feedback[0].leadId).toBe("string");
  // A second close in the same visit doesn't ask again.
  await page.getByRole("button", { name: /^Pay / }).click();
  await expect(page.getByText("Payment window closed.")).toBeVisible();
  await expect(survey).toHaveCount(0);
});

test("pressing Back on checkout asks first; Exit then leaves", async ({ page }) => {
  await atCheckout(page);
  await page.goto("/products/ganesh");
  await page.goto("/checkout");
  await expect(page.locator("form.bag-checkout")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window.history.state as { kalacarLeaveGuard?: boolean } | null)?.kalacarLeaveGuard)).toBe(true);
  await page.goBack();
  const survey = page.getByRole("dialog", { name: "Before you go" });
  await expect(survey).toBeVisible();
  await expect(page).toHaveURL(/\/checkout$/);
  await survey.getByRole("button", { name: "Exit" }).click();
  await expect(page).toHaveURL(/\/products\/ganesh$/);
});

test("the survey can be turned off", async ({ page }) => {
  await atCheckout(page, { leaveSurvey: { ...DEFAULT_PRODUCT_PAGE.leaveSurvey, show: false } });
  await page.goto("/checkout");
  await fillAddress(page);
  await page.getByRole("button", { name: /^Pay / }).click();
  await expect(page.getByText("Payment window closed.")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("leaving the shop from the page a visitor arrived on offers WhatsApp first; browsing inside the shop isn't stopped", async ({ page }) => {
  await mockShop(page, { content: content() });
  await page.goto("about:blank");
  await page.goto("/products/ganesh");
  await expect(page.locator(".detail-copy h1")).toBeVisible();
  await page.locator(".shop-footer").getByRole("link", { name: "About Kalacar" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/products\/ganesh$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // The next Back would leave the shop.
  await page.goBack();
  const panel = page.getByRole("dialog", { name: "Before you go" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link", { name: "Chat on WhatsApp" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Keep browsing" })).toBeVisible();
  await panel.getByRole("button", { name: "Exit" }).click();
  await expect(page).toHaveURL("about:blank");
});

test("the leaving-the-shop question can be turned off", async ({ page }) => {
  await mockShop(page, { content: content({ leaveSurvey: { ...DEFAULT_PRODUCT_PAGE.leaveSurvey, siteShow: false } }) });
  await page.goto("about:blank");
  await page.goto("/products/ganesh");
  await expect(page.locator(".detail-copy h1")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL("about:blank");
});
