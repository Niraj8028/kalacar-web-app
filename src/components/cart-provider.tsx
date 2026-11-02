"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { storeItems } from "@/data/catalogue";

type CartLine = { id: string; quantity: number };
type LiveStoreItem = (typeof storeItems)[number] & { stock?: number };
type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  canAdd: (id: string) => boolean;
  products: LiveStoreItem[];
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "kalacar-demo-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<LiveStoreItem[]>(storeItems);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { products: LiveStoreItem[] };
        if (active && data.products.length) setProducts(data.products);
      } catch { /* Keep the local preview catalogue if the API is offline. */ }
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

  const add = useCallback((id: string) => {
    const product = products.find(item => item.id === id);
    if (!product) return;
    setLines((current) => {
      const found = current.find((line) => line.id === id);
      if (product.stock !== undefined && (found?.quantity ?? 0) >= product.stock) return current;
      return found
        ? current.map((line) => line.id === id ? { ...line, quantity: line.quantity + 1 } : line)
        : [...current, { id, quantity: 1 }];
    });
  }, [products]);

  const setQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setLines((current) => current.filter((line) => line.id !== id));
      return;
    }
    setLines((current) => current.map((line) => line.id === id ? { ...line, quantity } : line));
  }, []);

  const remove = useCallback((id: string) => setLines((current) => current.filter((line) => line.id !== id)), []);

  const value = useMemo(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = lines.reduce((sum, line) => {
      const product = products.find((item) => item.id === line.id);
      return sum + (product?.price ?? 0) * line.quantity;
    }, 0);
    const canAdd = (id: string) => {
      const product = products.find(item => item.id === id);
      const quantity = lines.find(line => line.id === id)?.quantity ?? 0;
      return product?.stock === undefined || quantity < product.stock;
    };
    const clear = () => setLines([]);
    return { lines, count, subtotal, add, setQuantity, remove, canAdd, products, clear };
  }, [lines, products, add, setQuantity, remove]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used within CartProvider");
  return cart;
}

export function AddToBagButton({ id, className = "add-button", disabled = false }: { id: string; className?: string; disabled?: boolean }) {
  const { add, canAdd } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      className={className}
      type="button"
      disabled={disabled || !canAdd(id)}
      onClick={() => {
        add(id);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1500);
      }}
    >
      {disabled || !canAdd(id) ? "Out of stock" : added ? "Added ✓" : "Add to bag"}
    </button>
  );
}

export function CartLink() {
  const { count } = useCart();
  return (
    <Link className="bag-link" href="/cart" aria-label={`Shopping bag, ${count} ${count === 1 ? "item" : "items"}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 8h14l1 12H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </svg>
      <span>Bag{count > 0 ? ` (${count})` : ""}</span>
    </Link>
  );
}
