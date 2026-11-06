import { listProducts } from "@/lib/catalogue-db";

// Visitors share one read of the public product list for a few seconds, so traffic doesn't turn
// into database queries. Checkout re-checks stock itself, so a slightly older list can't oversell.
const FRESH_FOR_MS = 15000;
type Products = Awaited<ReturnType<typeof listProducts>>;
let saved: { at: number; products: Products } | null = null;
let reading: Promise<Products> | null = null;

export async function listShopProducts(): Promise<Products> {
  if (saved && Date.now() - saved.at < FRESH_FOR_MS) return saved.products;
  // Requests that arrive during a read wait for it. A failed read isn't kept, so the next request tries again.
  reading ??= listProducts().then(products => { saved = { at: Date.now(), products }; return products; }).finally(() => { reading = null; });
  return reading;
}
