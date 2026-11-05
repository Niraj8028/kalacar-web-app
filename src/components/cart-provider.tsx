"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BagIcon } from "@/components/icons";
import type { StoreColour, StoreItem } from "@/data/catalogue";

/** A cart line is one colour of one product. Old saved carts have no variantId: they use the first colour. */
export type CartLine = { id: string; variantId?: string; quantity: number };
export type ResolvedLine = { key: string; line: CartLine; product: StoreItem; colour: StoreColour };
type CartContextValue = {
  lines: CartLine[];
  resolved: ResolvedLine[];
  count: number;
  subtotal: number;
  add: (id: string, variantId?: string, quantity?: number) => boolean;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  changeColour: (key: string, variantId: string) => void;
  canAdd: (id: string, variantId?: string) => boolean;
  colourOf: (product: StoreItem, variantId?: string) => StoreColour | undefined;
  products: StoreItem[];
  catalogueLoading: boolean;
  catalogueError: string;
  clear: () => void;
  drawerView: DrawerView | null;
  openDrawer: (view: DrawerView) => void;
  closeDrawer: (leaveHistory?: boolean) => void;
};

export type DrawerView = "bag" | "checkout";
const RETURN_KEY = "kalacar.checkout-return.v1";
/** Remember to reopen checkout after signing in. Only honoured for 15 minutes. */
export function rememberCheckoutReturn() { try { sessionStorage.setItem(RETURN_KEY, String(Date.now())); } catch { /* storage unavailable */ } }

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "kalacar-demo-cart-v1";
export const lineKey = (line: CartLine) => `${line.id}:${line.variantId ?? ""}`;

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState("");
  const [drawerView, setDrawerView] = useState<DrawerView | null>(null);
  const drawerOpen = useRef(false);

  // Opening adds a history step, so a phone's Back button closes the drawer instead of leaving the page.
  const openDrawer = useCallback((view: DrawerView) => {
    if (!drawerOpen.current && window.location.pathname !== "/cart") window.history.pushState({ kalacarDrawer: true }, "");
    drawerOpen.current = true;
    setDrawerView(view);
  }, []);
  const closeDrawer = useCallback((leaveHistory = false) => {
    drawerOpen.current = false;
    setDrawerView(null);
    if (!leaveHistory && (window.history.state as { kalacarDrawer?: boolean } | null)?.kalacarDrawer) window.history.back();
  }, []);
  useEffect(() => {
    const onHistory = () => { if (!(window.history.state as { kalacarDrawer?: boolean } | null)?.kalacarDrawer) { drawerOpen.current = false; setDrawerView(null); } };
    window.addEventListener("popstate", onHistory);
    return () => window.removeEventListener("popstate", onHistory);
  }, []);
  useEffect(() => {
    try {
      const at = Number(sessionStorage.getItem(RETURN_KEY));
      if (!at || window.location.pathname.startsWith("/account")) return;
      sessionStorage.removeItem(RETURN_KEY);
      if (Date.now() - at < 15 * 60 * 1000) window.setTimeout(() => openDrawer("checkout"));
    } catch { /* storage unavailable */ }
  }, [openDrawer]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) throw new Error("Catalogue is temporarily unavailable.");
        const data = await response.json() as { products: StoreItem[] };
        if (active) { setProducts(data.products); setCatalogueError(""); }
      } catch (error) { if (active) { setProducts([]); setCatalogueError(error instanceof Error ? error.message : "Catalogue is temporarily unavailable."); } }
      finally { if (active) setCatalogueLoading(false); }
    };
    void refresh();
    const timer = window.setInterval(refresh, 2500);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(saved)) {
        const valid = saved.filter((line): line is CartLine =>
          Boolean(line) && typeof line.id === "string" && /^[a-z0-9-]{1,64}$/.test(line.id) &&
          (line.variantId === undefined || (typeof line.variantId === "string" && /^[a-z0-9-]{1,80}$/.test(line.variantId))) &&
          Number.isInteger(line.quantity) && line.quantity > 0,
        );
        setLines(valid);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const colourOf = useCallback((product: StoreItem, variantId?: string) =>
    (variantId ? product.variants.find(v => v.id === variantId) : undefined) ?? product.variants[0], []);

  /** Quantity already in the cart for this exact colour. */
  const inCart = useCallback((current: CartLine[], id: string, colourId: string, products: StoreItem[]) => {
    const product = products.find(p => p.id === id);
    return current.filter(line => line.id === id && product && colourOf(product, line.variantId)?.id === colourId).reduce((sum, line) => sum + line.quantity, 0);
  }, [colourOf]);

  const add = useCallback((id: string, variantId?: string, quantity = 1) => {
    const product = products.find(item => item.id === id);
    const colour = product && colourOf(product, variantId);
    if (!product || !colour) return false;
    let added = false;
    setLines(current => {
      const have = inCart(current, id, colour.id, products);
      const amount = Math.min(quantity, colour.stock - have);
      if (amount < 1) return current;
      added = true;
      const key = `${id}:${colour.id}`;
      const found = current.find(line => lineKey(line) === key);
      return found ? current.map(line => lineKey(line) === key ? { ...line, quantity: line.quantity + amount } : line) : [...current, { id, variantId: colour.id, quantity: amount }];
    });
    return added || colour.stock > inCart(lines, id, colour.id, products);
  }, [products, colourOf, inCart, lines]);

  const setQuantity = useCallback((key: string, quantity: number) => {
    if (quantity <= 0) { setLines(current => current.filter(line => lineKey(line) !== key)); return; }
    setLines(current => current.map(line => lineKey(line) === key ? { ...line, quantity } : line));
  }, []);

  const remove = useCallback((key: string) => setLines(current => current.filter(line => lineKey(line) !== key)), []);

  /** Switch a cart line to another colour of the same product, merging with that colour's line and capping at its stock. */
  const changeColour = useCallback((key: string, variantId: string) => {
    setLines(current => {
      const line = current.find(item => lineKey(item) === key);
      const product = line && products.find(p => p.id === line.id);
      const colour = product?.variants.find(v => v.id === variantId);
      if (!line || !product || !colour) return current;
      const rest = current.filter(item => lineKey(item) !== key);
      const targetKey = `${line.id}:${colour.id}`;
      const existing = rest.find(item => lineKey(item) === targetKey);
      const quantity = Math.min(colour.stock, line.quantity + (existing?.quantity ?? 0));
      if (quantity < 1) return current;
      return existing ? rest.map(item => lineKey(item) === targetKey ? { ...item, quantity } : item) : [...rest, { id: line.id, variantId: colour.id, quantity }];
    });
  }, [products]);

  const value = useMemo(() => {
    const resolved: ResolvedLine[] = lines.flatMap(line => {
      const product = products.find(item => item.id === line.id);
      const colour = product && colourOf(product, line.variantId);
      return product && colour ? [{ key: lineKey(line), line, product, colour }] : [];
    });
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = resolved.reduce((sum, item) => sum + item.colour.price * item.line.quantity, 0);
    const canAdd = (id: string, variantId?: string) => {
      const product = products.find(item => item.id === id);
      const colour = product && colourOf(product, variantId);
      return Boolean(colour) && inCart(lines, id, colour!.id, products) < colour!.stock;
    };
    const clear = () => setLines([]);
    return { lines, resolved, count, subtotal, add, setQuantity, remove, changeColour, canAdd, colourOf, products, clear, catalogueLoading, catalogueError, drawerView, openDrawer, closeDrawer };
  }, [lines, products, add, setQuantity, remove, changeColour, colourOf, inCart, catalogueLoading, catalogueError, drawerView, openDrawer, closeDrawer]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used within CartProvider");
  return cart;
}

export function AddToBagButton({ id, variantId, quantity = 1, className = "add-button", disabled = false, label = "Add to bag" }: { id: string; variantId?: string; quantity?: number; className?: string; disabled?: boolean; label?: string }) {
  const { add, canAdd, openDrawer } = useCart();
  const unavailable = disabled || !canAdd(id, variantId);
  return (
    <button
      className={className}
      type="button"
      disabled={unavailable}
      onClick={() => {
        if (add(id, variantId, quantity)) openDrawer("bag");
      }}
    >
      {unavailable ? "Out of stock" : label}
    </button>
  );
}

export function CartLink() {
  const { count, openDrawer } = useCart();
  return <button className="bag-link" type="button" onClick={() => openDrawer("bag")} aria-label={`Open your bag, ${count} ${count === 1 ? "item" : "items"}`}>
    <BagIcon size={21} />
    {count > 0 && <span className="bag-link-count">{count > 99 ? "99+" : count}</span>}
  </button>;
}
