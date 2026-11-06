import type { Page, Route } from "@playwright/test";

// The shop's API is answered here, so these tests never read or write the real database.
const swatch = "#b5763a";
const colour = (id: string, name: string, stock: number) => ({ id, name, swatch, gallery: ["/placeholder.png"], price: 999, originalPrice: 1299, stock, sort: 0, active: true });
export const product = (id: string, name: string, deity: string, variants: ReturnType<typeof colour>[]) => ({ id, name, deity, image: "/placeholder.png", gallery: ["/placeholder.png"], price: 999, originalPrice: 1299, stock: variants.reduce((sum, v) => sum + v.stock, 0), specs: [], highlights: [], accordions: [], variants, tagline: "A test murti", badge: "", placement: "", imageAlt: name });
export const PRODUCTS = [
  product("krushna", "Test Krushna", "Krishna", [colour("gold", "Gold", 5), colour("white", "White", 0)]),
  product("ganesh", "Test Ganesh", "Ganesh", [colour("plain", "Plain", 8)]),
  product("soldout", "Test Soldout", "Shiva", [colour("black", "Black", 0)]),
];

export type ShopState = { products: unknown[]; productsStatus: number; productCalls: number; open: boolean; user: unknown; orders: unknown[]; content: unknown; reviews: unknown[]; proof: unknown; contactBodies: unknown[] };

export async function mockShop(page: Page, over: Partial<ShopState> = {}) {
  const state: ShopState = { products: PRODUCTS, productsStatus: 200, productCalls: 0, open: true, user: null, orders: [], content: null, reviews: [], proof: { recent: [], soldThisWeek: {} }, contactBodies: [], ...over };
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  await page.route("**/_next/image**", route => route.fulfill({ status: 200, contentType: "image/svg+xml", body: "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>" }));
  await page.route("**/placeholder.png", route => route.fulfill({ status: 200, contentType: "image/svg+xml", body: "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'/>" }));
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/products") { state.productCalls += 1; return state.productsStatus === 200 ? json(route, { products: state.products }) : json(route, { error: "down" }, state.productsStatus); }
    if (path === "/api/settings") return json(route, { giftWrap: null, store: { open: state.open, previewing: false, comingSoonMessage: "Back soon", announcementEnabled: false, announcementText: "" } });
    if (path === "/api/site-content") return state.content ? json(route, state.content) : json(route, { error: "down" }, 503);
    if (path === "/api/reviews") return json(route, { reviews: state.reviews });
    if (path === "/api/social-proof") return json(route, state.proof);
    if (path === "/api/pages") return json(route, { pages: [{ slug: "about", title: "About Kalacar" }, { slug: "contact", title: "Contact us" }] });
    if (path === "/api/contact") { state.contactBodies.push(route.request().postDataJSON()); return json(route, { ok: true }); }
    if (path === "/api/realtime/config") return json(route, { key: null, cluster: null });
    if (path === "/api/auth/session") return json(route, { user: state.user });
    if (path === "/api/account/orders") return json(route, { orders: state.orders });
    if (path === "/api/account/addresses") return json(route, { addresses: [] });
    return json(route, { error: `Not expected in this test: ${path}` }, 500);
  });
  return state;
}

export async function expectFits(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (extra > 0) throw new Error(`Page is ${extra}px wider than the screen`);
}

/** Fails the test on any browser error, ignoring the mocked responses tests answer with on purpose. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) errors.push(message.text()); });
  return errors;
}
