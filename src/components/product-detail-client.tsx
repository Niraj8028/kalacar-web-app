"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AddToBagButton } from "@/components/cart-provider";
import { storeItems, type StoreItem } from "@/data/catalogue";

type LiveProduct = StoreItem & { stock: number };

export default function ProductDetailClient({ slug }: { slug: string }) {
  const [item, setItem] = useState<LiveProduct | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) throw new Error("catalogue unavailable");
        const data = await response.json() as { products: LiveProduct[] };
        if (active) setItem(data.products.find(product => product.id === slug) ?? null);
      } catch {
        const fallback = storeItems.find(product => product.id === slug);
        if (active && fallback) setItem({ ...fallback, stock: 0 });
      } finally { if (active) setLoaded(true); }
    };
    void refresh();
    const timer = window.setInterval(refresh, 2500);
    return () => { active = false; window.clearInterval(timer); };
  }, [slug]);

  if (!item) return <main className="product-page"><header className="detail-header"><Link className="wordmark" href="/">kalacar<span>.</span><small>SMALL DEVOTIONAL MURTIS</small></Link></header><section className="cart-content"><h1>{loaded ? "Murti not found" : "Loading product…"}</h1><Link href="/#catalogue">← Back to all murtis</Link></section></main>;
  const gallery = item.gallery?.length ? item.gallery : [item.image];

  return <main className="product-page">
    <header className="detail-header"><Link className="wordmark" href="/">kalacar<span>.</span><small>SMALL DEVOTIONAL MURTIS</small></Link><Link className="back-to-shop" href="/#catalogue">← Back to all murtis</Link></header>
    <nav className="detail-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/#catalogue">Murtis</Link><span>/</span><span>{item.name}</span></nav>
    <section className="detail-layout">
      <div className="detail-gallery"><div className="detail-main-image"><Image src={gallery[0]} alt={item.imageAlt} fill priority sizes="(max-width: 760px) 100vw, 58vw" /></div><div className="detail-thumbnails" aria-label={`${item.deity} image gallery`}>{gallery.slice(1).map((image, index) => <div className="detail-thumbnail" key={image}><Image src={image} alt={`${item.deity} murti view ${index + 2}`} fill sizes="(max-width: 760px) 33vw, 18vw" /></div>)}</div><p className="detail-image-note">Product photos supplied for this local catalogue preview.</p></div>
      <div className="detail-copy"><p className="eyebrow">{item.deity} · SMALL DEVOTIONAL MURTI</p><h1>{item.name}</h1><p className="detail-placement">Made for a car dashboard, Devghar, or personal mandir.</p>
        <p className="detail-demo-offer">{item.originalPrice > item.price ? `DEMO OFFER · Sample savings of ₹${item.originalPrice - item.price}` : "LOCAL PREVIEW PRICE"}</p><p className="detail-price">₹{item.price}{item.originalPrice > item.price && <> <del>₹{item.originalPrice}</del></>}</p><p className="detail-demo-caption">Preview price · {item.stock ? `${item.stock} available` : "out of stock"}</p><AddToBagButton id={item.id} className="detail-add-button" disabled={item.stock < 1} />
        <div className="detail-rule"/><h2>A small murti for your space</h2><p>Explore this {item.deity} murti as a devotional accent for your car or home.</p><dl className="product-facts"><div><dt>Deity</dt><dd>{item.deity}</dd></div><div><dt>Suggested placement</dt><dd>Car dashboard or Devghar</dd></div><div><dt>Size</dt><dd>To be confirmed</dd></div><div><dt>Material</dt><dd>To be confirmed</dd></div><div><dt>Availability</dt><dd>{item.stock ? `${item.stock} in stock` : "Out of stock"}</dd></div></dl>
      </div>
    </section>
  </main>;
}
