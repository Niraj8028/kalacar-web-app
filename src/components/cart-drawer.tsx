"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { BagLines, GiftChoice, money } from "@/components/bag-lines";
import { useCart } from "@/components/cart-provider";
import { ArrowRight, BagIcon, CloseMark } from "@/components/icons";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])';

/** The quick look after Add to bag. Checkout itself happens on the bag page, which shows this same bag. */
export default function CartDrawer() {
  const { drawerOpen, closeDrawer, resolved, count, subtotal, giftOffer, wantGift, catalogueLoading, catalogueError } = useCart();
  const pathname = usePathname();
  const open = drawerOpen && pathname !== "/cart";
  const panel = useRef<HTMLDivElement>(null);
  const previousPath = useRef(pathname);

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

  const giftTotal = giftOffer && wantGift ? giftOffer.price : 0;
  const leave = () => closeDrawer(true);
  return <div className={`bag-drawer${open ? " open" : ""}`} aria-hidden={!open}>
    <button type="button" className="bag-backdrop" aria-label="Close" tabIndex={-1} onClick={() => closeDrawer()} />
    <div className="bag-panel" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="bag-title">
      <div className="bag-flow drawer">
        <header className="bag-head">
          <h2 id="bag-title"><BagIcon /> Your bag{count > 0 && <span className="bag-count">{count}</span>}</h2>
          <button type="button" className="bag-close" aria-label="Close" onClick={() => closeDrawer()}><CloseMark /></button>
        </header>
        <div className="bag-body">
          {catalogueError ? <div className="bag-empty" role="alert"><p>{catalogueError}</p></div>
            : catalogueLoading ? <div className="bag-empty" role="status"><p>Checking current prices and stock…</p></div>
            : resolved.length ? <BagLines onNavigate={leave} />
            : <div className="bag-empty"><BagIcon size={34} /><p>Your bag is empty.</p><Link className="checkout-demo-button" href="/#catalogue" onClick={leave}>Browse murtis</Link></div>}
        </div>
        {!catalogueError && !catalogueLoading && resolved.length > 0 && <footer className="bag-foot">
          <GiftChoice />
          <div className="bag-totals">
            <div><span>Subtotal</span><span>{money(subtotal)}</span></div>
            {giftTotal > 0 && <div><span>{giftOffer?.title}</span><span>{money(giftTotal)}</span></div>}
            <div className="bag-total"><span>Total</span><strong>{money(subtotal + giftTotal)}</strong></div>
          </div>
          <Link className="checkout-demo-button" href="/cart" onClick={leave}>Proceed to checkout <ArrowRight /></Link>
          <button type="button" className="bag-text-link" onClick={() => closeDrawer()}>Continue shopping</button>
        </footer>}
      </div>
    </div>
  </div>;
}
