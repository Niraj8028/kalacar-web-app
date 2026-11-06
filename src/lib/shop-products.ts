import { listProducts } from "@/lib/catalogue-db";

// Visitors share one read of the public product list for a few seconds, so traffic doesn't turn
// into database queries. A change clears it at once. Checkout re-checks stock itself, so a slightly
// older list can't oversell. Kept on globalThis because each route can get its own copy of this file.
const FRESH_FOR_MS = 15000;
type Products = Awaited<ReturnType<typeof listProducts>>;
type Cache = { saved: { at: number; products: Products } | null; reading: Promise<Products> | null; generation: number };
const holder = globalThis as unknown as { kalacarShopProducts?: Cache };
const cache = () => (holder.kalacarShopProducts ??= { saved: null, reading: null, generation: 0 });

export async function listShopProducts(): Promise<Products> {
  const state = cache();
  if (state.saved && Date.now() - state.saved.at < FRESH_FOR_MS) return state.saved.products;
  if (state.reading) return state.reading;
  const generation = state.generation;
  // Requests that arrive during a read wait for it. A failed read isn't kept, so the next request tries again.
  const reading = listProducts().then(products => {
    // A change during the read may be missing from it, so it's used for this answer but not kept.
    if (generation === state.generation) state.saved = { at: Date.now(), products };
    return products;
  }).finally(() => { if (state.reading === reading) state.reading = null; });
  state.reading = reading;
  return reading;
}

export function forgetShopProducts() {
  const state = cache();
  state.generation += 1;
  state.saved = null;
  state.reading = null;
}
