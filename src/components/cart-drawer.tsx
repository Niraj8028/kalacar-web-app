"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import BagFlow from "@/components/bag-flow";
import { useCart } from "@/components/cart-provider";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])';

/** The side panel. It stays mounted after first opening, so typed details survive closing and reopening. */
export default function CartDrawer() {
  const { drawerView, closeDrawer } = useCart();
  const pathname = usePathname();
  const onCartPage = pathname === "/cart";
  const open = Boolean(drawerView) && !onCartPage;
  const [used, setUsed] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const previousPath = useRef(pathname);
  if (open && !used) setUsed(true);

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { closeDrawer(); return; }
      if (event.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(item => item.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; before?.focus?.(); };
  }, [open, closeDrawer]);

  // Going to another page closes the drawer.
  useEffect(() => {
    if (previousPath.current !== pathname) { previousPath.current = pathname; closeDrawer(true); }
  }, [pathname, closeDrawer]);

  if (onCartPage || !used) return null;
  return <div className={`bag-drawer${open ? " open" : ""}`} aria-hidden={!open}>
    <button type="button" className="bag-backdrop" aria-label="Close" tabIndex={-1} onClick={() => closeDrawer()} />
    <div className="bag-panel" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="bag-title"><BagFlow mode="drawer" active={open} /></div>
  </div>;
}
