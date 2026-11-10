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
type Proof = { recent: { productId: string; productName: string; minutesAgo: number; firstName: string }[]; soldThisWeek: Record<string, number> };
const EyeIcon = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
const FlameIcon = () => <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M12 2s1 3.2-1.4 6C8.4 10.6 6 12.6 6 16a6 6 0 0 0 12 0c0-2.7-1.4-4.6-2.6-5.9.1 1.9-.6 3.3-1.8 3.9.5-3.6-.8-8.6-1.6-12Z" /></svg>;
/** "12 hours", "3 days": the owner's window for the sold count. */
const windowText = (hours: number) => hours % 24 === 0 && hours >= 48 ? `${hours / 24} days` : `${hours} ${hours === 1 ? "hour" : "hours"}`;
const agoText = (minutes: number) => minutes < 1 ? "just now" : minutes < 60 ? `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago` : minutes < 1440 ? `${Math.floor(minutes / 60)} ${minutes < 120 ? "hour" : "hours"} ago` : `${Math.floor(minutes / 1440)} ${minutes < 2880 ? "day" : "days"} ago`;

/** Real people on this page right now. Hidden below the owner's minimum, and when live updates are off. */
export function LiveViewers({ productId }: { productId: string }) {
  const { viewers } = useSiteContent().productPage;
  const count = useViewerCount(productId, viewers.show);
  if (!viewers.show || count < Math.max(2, viewers.minimum)) return null;
  return <p className="live-viewers"><span className="live-viewers-icon"><EyeIcon /></span>{count} people are viewing this right now</p>;
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

/** From real paid orders within the owner's window (e.g. the last 12 hours). */
export function SoldThisWeek({ count }: { count: number }) {
  const { soldThisWeek } = useSiteContent().productPage;
  if (!soldThisWeek.show || count < soldThisWeek.minimum) return null;
  return <p className="sold-this-week"><FlameIcon />{count} sold in last {windowText(soldThisWeek.hours)}</p>;
}

/**
 * A real recent order, with the murti's photo. Shows a first name only if the owner has chosen to.
 * The owner sets the wait before each pop-up, how long it stays, and its size. Up to 5 are shown per visit.
 */
export function RecentSaleNotice({ proof, products }: { proof: Proof; products: StoreItem[] }) {
  const { recentSales: settings } = useSiteContent().productPage;
  const [index, setIndex] = useState(-1);
  const [closed, setClosed] = useState(false);
  const sales = proof.recent;
  useEffect(() => {
    if (!settings.show || !sales.length || closed) return;
    const timers: number[] = [];
    const count = Math.min(sales.length, 5);
    for (let step = 0; step < count; step += 1) {
      const start = (step + 1) * settings.delay * 1000 + step * settings.duration * 1000;
      timers.push(window.setTimeout(() => setIndex(step), start), window.setTimeout(() => setIndex(-1), start + settings.duration * 1000));
    }
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [sales, closed, settings.show, settings.delay, settings.duration]);
  const sale = index >= 0 ? sales[index] : undefined;
  if (!settings.show || !sale || closed) return null;
  const product = products.find(item => item.id === sale.productId);
  return <div className={`recent-sale size-${settings.size}`} role="status">
    <Link href={`/products/${sale.productId}`}>
      {settings.showImage && product && <span className="recent-sale-image"><Image src={product.image} alt="" fill sizes="64px" /></span>}
      <span className="recent-sale-copy"><span><b>{sale.firstName || "Someone"}</b> has bought {sale.productName}</span><small>{agoText(sale.minutesAgo)}</small></span>
    </Link>
    <button type="button" aria-label="Close" onClick={() => setClosed(true)}>×</button>
  </div>;
}

/** The same pop-up on the home page, when the owner turns on "every page". */
export function HomeRecentSales() {
  const { recentSales } = useSiteContent().productPage;
  const { products } = useCart();
  const proof = useSocialProof(recentSales.show && recentSales.everyPage);
  if (!recentSales.everyPage) return null;
  return <RecentSaleNotice proof={proof} products={products} />;
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
    <ul>{all.map(product => <li key={product.id} className="card-clickable"><span className="bundle-image"><Image src={product.image} alt="" fill sizes="80px" /></span><Link className="card-link" href={`/products/${product.id}`}>{product.name}</Link><small>{money(firstColour(product)?.price ?? 0)}</small></li>)}</ul>
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
