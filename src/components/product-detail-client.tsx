"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AddToBagButton } from "@/components/cart-provider";
import type { StoreItem } from "@/data/catalogue";

type LiveProduct = StoreItem & { stock: number };

export default function ProductDetailClient({ slug }: { slug: string }) {
  const [item, setItem] = useState<LiveProduct | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [catalogueError, setCatalogueError] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) throw new Error("catalogue unavailable");
        const data = await response.json() as { products: LiveProduct[] };
        if (active) { setItem(data.products.find(product => product.id === slug) ?? null); setCatalogueError(""); }
      } catch (error) {
        if (active) { setItem(null); setCatalogueError(error instanceof Error ? error.message : "Catalogue is temporarily unavailable."); }
      } finally { if (active) setLoaded(true); }
    };
    void refresh();
    const timer = window.setInterval(refresh, 2500);
    return () => { active = false; window.clearInterval(timer); };
  }, [slug]);

  if (!item) return <main className="product-page"><header className="detail-header"><Link className="wordmark" href="/">kalacar<span>.</span><small>SMALL DEVOTIONAL MURTIS</small></Link></header><section className="cart-content"><h1>{catalogueError || (loaded ? "Product not found in the current catalogue." : "Loading product…")}</h1><Link href="/#catalogue">← Back to all products</Link></section></main>;
  const gallery = item.gallery?.length ? item.gallery : [item.image];

  return <main className="product-page">
    {process.env.NODE_ENV === "development" && <p className="local-data-notice" role="note">Local development · Confirm this database product’s details, price, and stock before launch. Payments remain in test mode.</p>}
    <header className="detail-header"><Link className="wordmark" href="/">kalacar<span>.</span><small>SMALL DEVOTIONAL MURTIS</small></Link><Link className="back-to-shop" href="/#catalogue">← Back to all murtis</Link></header>
    <nav className="detail-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/#catalogue">Murtis</Link><span>/</span><span>{item.name}</span></nav>
    <section className="detail-layout">
      <div className="detail-gallery"><div className="detail-main-image"><Image src={gallery[0]} alt={item.imageAlt} fill priority sizes="(max-width: 760px) 100vw, 58vw" /></div><div className="detail-thumbnails" aria-label={`${item.deity} image gallery`}>{gallery.slice(1).map((image, index) => <div className="detail-thumbnail" key={image}><Image src={image} alt={`${item.deity} murti view ${index + 2}`} fill sizes="(max-width: 760px) 33vw, 18vw" /></div>)}</div></div>
      <div className="detail-copy"><p className="eyebrow">{item.deity} · SMALL DEVOTIONAL MURTI</p><h1>{item.name}</h1>{item.placement && <p className="detail-placement">{item.placement}</p>}
        <p className="detail-price">₹{item.price}</p><p className="detail-demo-caption">{item.stock ? `${item.stock} available` : "Out of stock"}</p><AddToBagButton id={item.id} className="detail-add-button" disabled={item.stock < 1} />
        <div className="detail-rule"/><h2>Product details</h2><dl className="product-facts"><div><dt>Deity</dt><dd>{item.deity}</dd></div><div><dt>Availability</dt><dd>{item.stock ? `${item.stock} in stock` : "Out of stock"}</dd></div></dl>
      </div>
    </section>
  </main>;
}
