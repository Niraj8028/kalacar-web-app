"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { useCart } from "@/components/cart-provider";
import { useSiteContent } from "@/components/site-content-provider";
import { WHATSAPP_URL } from "@/components/policy-links";
import type { StoreItem } from "@/data/catalogue";
import { useViewerCount } from "@/lib/realtime-client";

const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
type Proof = { recent: { productId: string; productName: string; hoursAgo: number; firstName: string }[]; soldThisWeek: Record<string, number> };

/** Real people on this page right now. Hidden below the owner's minimum, and when live updates are off. */
export function LiveViewers({ productId }: { productId: string }) {
  const { viewers } = useSiteContent().productPage;
  const count = useViewerCount(productId, viewers.show);
  if (!viewers.show || count < Math.max(2, viewers.minimum)) return null;
  return <p className="live-viewers"><span aria-hidden="true" />{count} people are viewing this right now</p>;
}

export function useSocialProof(enabled: boolean) {
  const [proof, setProof] = useState<Proof>({ recent: [], soldThisWeek: {} });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetch("/api/social-proof", { cache: "no-store" }).then(response => response.json() as Promise<Proof>).then(data => { if (active) setProof(data); }).catch(() => undefined);
    return () => { active = false; };
  }, [enabled]);
  return proof;
}

/** From real paid orders in the last 7 days. */
export function SoldThisWeek({ count }: { count: number }) {
  const { soldThisWeek } = useSiteContent().productPage;
  if (!soldThisWeek.show || count < soldThisWeek.minimum) return null;
  return <p className="sold-this-week">{count} sold this week</p>;
}

/** A real recent order. Shows a first name only if the owner has chosen to. */
export function RecentSaleNotice({ proof }: { proof: Proof }) {
  const [index, setIndex] = useState(-1);
  const [closed, setClosed] = useState(false);
  const sales = proof.recent;
  useEffect(() => {
    if (!sales.length || closed) return;
    let step = 0;
    const show = window.setTimeout(() => setIndex(0), 8000);
    const next = window.setInterval(() => { step += 1; if (step >= Math.min(sales.length, 3) * 2) { setIndex(-1); window.clearInterval(next); return; } setIndex(step % 2 ? -1 : step / 2); }, 8000);
    return () => { window.clearTimeout(show); window.clearInterval(next); };
  }, [sales, closed]);
  const sale = index >= 0 ? sales[index] : undefined;
  if (!sale || closed) return null;
  const when = sale.hoursAgo < 1 ? "within the last hour" : sale.hoursAgo < 24 ? `${sale.hoursAgo} ${sale.hoursAgo === 1 ? "hour" : "hours"} ago` : `${Math.floor(sale.hoursAgo / 24)} ${sale.hoursAgo < 48 ? "day" : "days"} ago`;
  return <div className="recent-sale" role="status">
    <Link href={`/products/${sale.productId}`}><b>{sale.firstName || "Someone"}</b> bought {sale.productName} <small>{when}</small></Link>
    <button type="button" aria-label="Close" onClick={() => setClosed(true)}>×</button>
  </div>;
}

export function OfferBox() {
  const { offer } = useSiteContent().productPage;
  if (!offer.show || !offer.text) return null;
  return <div className="offer-box"><b>{offer.title}</b><p>{offer.text}</p></div>;
}

export function HowItsMade() {
  const { howMade } = useSiteContent().productPage;
  if (!howMade.show || !howMade.message) return null;
  return <details className="how-made" open>
    <summary>{howMade.title}</summary>
    <div>{howMade.showImage && howMade.image && <span className="how-made-image"><Image src={howMade.image} alt={howMade.founder || "Kalacar founder"} fill sizes="72px" /></span>}<div><p>{howMade.message}</p>{howMade.founder && <small>{howMade.founder}</small>}</div></div>
  </details>;
}

export function CommonFaqs() {
  const { faqs } = useSiteContent().productPage;
  if (!faqs.show || !faqs.items.length) return null;
  return <section className="common-faqs" aria-labelledby="common-faqs-title"><h2 id="common-faqs-title">{faqs.title}</h2>{faqs.items.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>;
}

export function WhatsappHelp() {
  const { whatsappHelp } = useSiteContent().productPage;
  if (!whatsappHelp.show) return null;
  return <a className="whatsapp-help" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">{whatsappHelp.label}</a>;
}

/** Frequently bought together: this murti plus the 1 or 2 the owner chose. Only products in stock are offered. */
export function BundleBox({ item, products }: { item: StoreItem; products: StoreItem[] }) {
  const { add, canAdd, openDrawer } = useCart();
  const firstColour = (product: StoreItem) => product.variants.find(colour => colour.stock > 0);
  const partners = (item.bundleIds ?? []).map(id => products.find(product => product.id === id)).filter((product): product is StoreItem => Boolean(product && firstColour(product)));
  const mine = firstColour(item);
  if (!partners.length || !mine) return null;
  const all = [item, ...partners];
  const total = all.reduce((sum, product) => sum + (firstColour(product)?.price ?? 0), 0);
  const addAll = () => { all.forEach(product => { const colour = firstColour(product); if (colour && canAdd(product.id, colour.id)) add(product.id, colour.id, 1); }); openDrawer(); };
  return <section className="bundle-box" aria-labelledby="bundle-title">
    <h2 id="bundle-title">Frequently bought together</h2>
    <ul>{all.map(product => <li key={product.id}><span className="bundle-image"><Image src={product.image} alt="" fill sizes="80px" /></span><Link href={`/products/${product.id}`}>{product.name}</Link><small>{money(firstColour(product)?.price ?? 0)}</small></li>)}</ul>
    <button className="detail-add-button" type="button" onClick={addAll}>Add all to bag · {money(total)}</button>
  </section>;
}

/** Appears once the main buttons have scrolled out of view. */
export function StickyBuyBar({ item, price, watch, onAdd, onBuy, disabled, inBag }: { item: StoreItem; price: number; watch: RefObject<HTMLElement | null>; onAdd: () => void; onBuy: () => void; disabled: boolean; inBag: boolean }) {
  const { stickyBar } = useSiteContent().productPage;
  const [show, setShow] = useState(false);
  useEffect(() => {
    const target = watch.current;
    if (!stickyBar.show || !target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(target);
    return () => observer.disconnect();
  }, [stickyBar.show, watch]);
  if (!stickyBar.show || !show) return null;
  return <div className="sticky-buy-bar" role="region" aria-label="Buy this murti">
    <span className="sticky-buy-image"><Image src={item.image} alt="" fill sizes="44px" /></span>
    <div className="sticky-buy-copy"><b>{item.name}</b><span>{money(price)}</span></div>
    <button className="sticky-add" type="button" disabled={disabled && !inBag} onClick={onAdd}>{disabled ? inBag ? "In your bag" : "Out of stock" : "Add to bag"}</button>
    <button className="sticky-buy" type="button" disabled={disabled} onClick={onBuy}>Buy now</button>
  </div>;
}

export function EndOfPageLink() {
  const { endLink } = useSiteContent().productPage;
  if (!endLink.show) return null;
  return <div className="end-of-page">{/^https:/.test(endLink.link) ? <a href={endLink.link} target="_blank" rel="noopener noreferrer">{endLink.label}</a> : <Link href={endLink.link}>{endLink.label}</Link>}</div>;
}
