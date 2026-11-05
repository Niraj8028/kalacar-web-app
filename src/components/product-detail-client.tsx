"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AddToBagButton, useCart } from "@/components/cart-provider";
import type { StoreItem } from "@/data/catalogue";
import { ProductDetailAccordions } from "@/components/product-detail-accordions";
import { DeliveryLine, ProductHighlights, SpecCards } from "@/components/product-facts";
import { RecommendedProducts } from "@/components/recommended-products";
import { ArrowLeft } from "@/components/icons";

const LOW_STOCK = 3;
const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const savePercent = (price: number, regular: number) => regular > price ? Math.round((1 - price / regular) * 100) : 0;

/** `initialColour` comes from ?colour= so a shared link (or "change" from the cart) opens that colour. */
export default function ProductDetailClient({ slug, initialColour = "" }: { slug: string; initialColour?: string }) {
  const router = useRouter();
  const { products, catalogueLoading, catalogueError, add, lines } = useCart();
  const item: StoreItem | undefined = products.find(product => product.id === slug);
  const [chosenId, setChosenId] = useState(initialColour);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  if (!item) return <main className="product-page"><header className="detail-header"><Link className="wordmark" href="/">kalacar<span>.</span><small>SMALL DEVOTIONAL MURTIS</small></Link></header><section className="cart-content"><h1>{catalogueError || (catalogueLoading ? "Loading product…" : "Product not found in the current catalogue.")}</h1><Link href="/#catalogue"><ArrowLeft /> Back to all products</Link></section></main>;

  const colours = item.variants;
  const colour = colours.find(c => c.id === chosenId) ?? colours.find(c => c.stock > 0) ?? colours[0];
  const gallery = colour?.gallery.length ? colour.gallery : item.gallery?.length ? item.gallery : [item.image];
  const shownImage = gallery[Math.min(imageIndex, gallery.length - 1)];
  const inCart = lines.filter(line => line.id === item.id && (line.variantId ?? colours[0]?.id) === colour?.id).reduce((sum, line) => sum + line.quantity, 0);
  const canBuy = Math.max(0, Math.min(10, (colour?.stock ?? 0) - inCart));
  const qty = Math.max(1, Math.min(quantity, canBuy || 1));
  const save = colour ? savePercent(colour.price, colour.originalPrice) : 0;
  const pricesDiffer = new Set(colours.map(c => c.price)).size > 1;
  const choose = (id: string) => {
    setChosenId(id); setImageIndex(0); setQuantity(1);
    try { const url = new URL(window.location.href); url.searchParams.set("colour", id); window.history.replaceState(null, "", url); } catch { /* address bar unchanged */ }
  };
  const stockMessage = !colour || colour.stock < 1 ? { tone: "out", text: colours.length > 1 ? `${colour?.name ?? "This colour"} is out of stock — try another colour.` : "Out of stock" }
    : colour.stock <= LOW_STOCK ? { tone: "low", text: `Only ${colour.stock} left — order soon` } : { tone: "ok", text: "In stock" };
  const buyNow = () => { if (canBuy < 1 && inCart < 1) return; if (canBuy > 0) add(item.id, colour.id, qty); router.push("/cart"); };

  return <main className="product-page">
    {process.env.NODE_ENV === "development" && <p className="local-data-notice" role="note">Local development · Confirm this database product’s details, price, and stock before launch. Payments remain in test mode.</p>}
    <header className="detail-header"><Link className="wordmark" href="/">kalacar<span>.</span><small>SMALL DEVOTIONAL MURTIS</small></Link><Link className="back-to-shop" href="/#catalogue"><ArrowLeft /> Back to all murtis</Link></header>
    <nav className="detail-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/#catalogue">Murtis</Link><span>/</span><span>{item.name}</span></nav>
    <section className="detail-layout">
      <div className="detail-gallery">
        <div className="detail-main-image">
          <Image key={shownImage} src={shownImage} alt={`${item.name}${colours.length > 1 ? ` in ${colour?.name}` : ""}`} fill priority sizes="(max-width: 760px) 100vw, 58vw" />
          {(item.badge || save > 0) && <div className="detail-image-badges">{item.badge && <span className="badge-chip">{item.badge}</span>}{save > 0 && <span className="badge-chip save">Save {save}%</span>}</div>}
        </div>
        {gallery.length > 1 && <div className="detail-thumbnails" role="group" aria-label={`${item.name} photos`}>{gallery.map((image, index) => <button type="button" className={`detail-thumbnail${image === shownImage ? " selected" : ""}`} key={image} aria-label={`Show photo ${index + 1}`} aria-pressed={image === shownImage} onClick={() => setImageIndex(index)}><Image src={image} alt="" fill sizes="120px" /></button>)}</div>}
      </div>
      <div className="detail-copy">
        <p className="eyebrow">{item.deity} · SMALL DEVOTIONAL MURTI</p>
        <h1>{item.name}</h1>
        {item.tagline && <p className="detail-tagline">{item.tagline}</p>}
        {item.placement && <p className="detail-placement">{item.placement}</p>}
        <p className="detail-price">{money(colour?.price ?? item.price)}{save > 0 && <><del>{money(colour.originalPrice)}</del><span className="save-chip">Save {save}%</span></>}</p>
        <p className="detail-tax-note">Prices include all taxes.</p>

        {colours.length > 1 && <fieldset className="colour-picker">
          <legend>Colour: <b>{colour?.name}</b></legend>
          <div className="colour-options">{colours.map(option => <label key={option.id} className={`colour-option${option.id === colour?.id ? " selected" : ""}${option.stock < 1 ? " sold-out" : ""}`}>
            <input type="radio" name="colour" value={option.id} checked={option.id === colour?.id} onChange={() => choose(option.id)} />
            <span className="colour-dot" style={{ background: option.swatch }} aria-hidden="true" />
            <span>{option.name}</span>
            {(pricesDiffer || option.stock < 1) && <small>{option.stock < 1 ? "Sold out" : money(option.price)}</small>}
          </label>)}</div>
        </fieldset>}

        <div className="buy-box">
          <div className="quantity-row">
            <span className="quantity-label">Quantity</span>
            <div className="quantity-control" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQuantity(qty - 1)}>−</button>
              <span aria-live="polite">{qty}</span>
              <button type="button" aria-label="Increase quantity" disabled={qty >= canBuy} onClick={() => setQuantity(qty + 1)}>+</button>
            </div>
            {inCart > 0 && <small className="in-cart-note">{inCart} already in your bag</small>}
          </div>
          <p className={`stock-message ${stockMessage.tone}`} role="status">{stockMessage.text}</p>
          <div className="buy-buttons">
            <AddToBagButton id={item.id} variantId={colour?.id} quantity={qty} className="detail-add-button" disabled={canBuy < 1} label="Add to bag" />
            <button type="button" className="buy-now-button" disabled={canBuy < 1 && inCart < 1} onClick={buyNow}>Buy now</button>
          </div>
          <DeliveryLine />
        </div>
        <ProductHighlights items={item.highlights ?? []} />
        <SpecCards specs={item.specs ?? []} />

        <div className="detail-rule" /><h2>Product details</h2>
        <dl className="product-facts"><div><dt>Category</dt><dd>{item.deity}</dd></div>{colours.length > 1 && <div><dt>Colours</dt><dd>{colours.map(c => c.name).join(", ")}</dd></div>}<div><dt>Availability</dt><dd>{colour && colour.stock > 0 ? `${colour.stock} in stock${colours.length > 1 ? ` in ${colour.name}` : ""}` : "Out of stock"}</dd></div></dl>
      </div>
    </section>
    <ProductDetailAccordions sections={item.accordions ?? []} />
    <RecommendedProducts current={item} products={products} />
  </main>;
}
