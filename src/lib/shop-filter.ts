// Lets the phone menu filter the home page catalogue from any page.
export type ShopFilter = { category?: string; search?: string };
const EVENT = "kalacar:filter";
const PENDING = "kalacar.pending-filter";

/** On the home page the catalogue updates straight away; elsewhere the filter waits until the home page opens. */
export function requestShopFilter(filter: ShopFilter, navigate: (href: string) => void) {
  if (window.location.pathname === "/") { window.dispatchEvent(new CustomEvent<ShopFilter>(EVENT, { detail: filter })); return; }
  try { sessionStorage.setItem(PENDING, JSON.stringify(filter)); } catch { /* storage unavailable: the home page just opens unfiltered */ }
  navigate("/#catalogue");
}

/** Used by the home page: applies a filter left by another page, then listens for new ones. */
export function listenForShopFilter(apply: (filter: ShopFilter) => void) {
  try {
    const pending = sessionStorage.getItem(PENDING);
    if (pending) { sessionStorage.removeItem(PENDING); apply(JSON.parse(pending) as ShopFilter); }
  } catch { /* ignore */ }
  const onFilter = (event: Event) => apply((event as CustomEvent<ShopFilter>).detail);
  window.addEventListener(EVENT, onFilter);
  return () => window.removeEventListener(EVENT, onFilter);
}
