"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/components/cart-provider";
import { CloseMark, MenuIcon, Search, UserCircle } from "@/components/icons";
import { PolicyLinks, WHATSAPP_URL } from "@/components/policy-links";
import ThemeToggle from "@/components/theme-toggle";
import { requestShopFilter } from "@/lib/shop-filter";
import { SUPPORT_WHATSAPP } from "@/data/support";
import type { ShopFilter } from "@/lib/shop-filter";

/** Phones only: search, categories, account, theme and information pages live behind this button; the bag stays in the header. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { products } = useCart();
  const categories = useMemo(() => [...new Set(products.map(item => item.deity))], [products]);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("input, button")?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    const trigger = button.current;
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); trigger?.focus(); };
  }, [open]);

  const choose = (filter: ShopFilter) => { setOpen(false); requestShopFilter(filter, href => router.push(href)); };

  return <>
    <button ref={button} className="menu-button" type="button" aria-label="Open menu" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(true)}><MenuIcon /></button>
    {open && createPortal(<div className="mobile-menu-backdrop" onClick={() => setOpen(false)}>
      <div ref={panel} id="mobile-menu" className="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" onClick={event => event.stopPropagation()}>
        <div className="mobile-menu-top">
          <b>Menu</b>
          <button className="mobile-menu-close" type="button" aria-label="Close menu" onClick={() => setOpen(false)}><CloseMark /></button>
        </div>
        <form className="mobile-menu-search" role="search" onSubmit={event => { event.preventDefault(); choose({ search: query.trim() }); }}>
          <Search />
          <input type="search" placeholder="Search murtis" aria-label="Search murtis" value={query} onChange={event => setQuery(event.target.value)} enterKeyHint="search" />
        </form>
        <nav className="mobile-menu-section" aria-label="Shop by category">
          <p>Shop by category</p>
          <button type="button" onClick={() => choose({ category: "All murtis", search: "" })}>All murtis</button>
          {categories.map(category => <button key={category} type="button" onClick={() => choose({ category, search: "" })}>{category}</button>)}
        </nav>
        <div className="mobile-menu-section">
          <p>Your account</p>
          <Link href="/account" onClick={() => setOpen(false)}><UserCircle size={20} /> Account & orders</Link>
          <div className="mobile-menu-theme"><span>Light or dark</span><ThemeToggle /></div>
        </div>
        <div className="mobile-menu-section mobile-menu-info">
          <p>Information</p>
          <PolicyLinks className="mobile-menu-links" />
          <a href={`${WHATSAPP_URL}?text=${encodeURIComponent("Hi Kalacar, I have a question.")}`} target="_blank" rel="noopener noreferrer">WhatsApp us · {SUPPORT_WHATSAPP.display}</a>
        </div>
      </div>
    </div>, document.body)}
  </>;
}
