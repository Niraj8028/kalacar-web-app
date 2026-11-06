"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useSiteContent } from "@/components/site-content-provider";
import { Stars, VideoRow } from "@/components/reviews";
import { instagramLink, videoEmbed } from "@/data/site-content";
import type { StoreItem } from "@/data/catalogue";

const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const cheapest = (item: StoreItem) => [...item.variants].filter(v => v.stock > 0).sort((a, b) => a.price - b.price)[0];

/** Adds to the bag and opens it, without leaving the page. Asks for a colour first if there's a choice. */
function useQuickBuy() {
  const { add, canAdd, openDrawer } = useCart();
  const [choosing, setChoosing] = useState<StoreItem | null>(null);
  const addAndOpen = (item: StoreItem, colourId: string) => { if (canAdd(item.id, colourId)) add(item.id, colourId, 1); openDrawer(); setChoosing(null); };
  const start = (item: StoreItem) => {
    const available = item.variants.filter(v => v.stock > 0);
    if (available.length === 1) addAndOpen(item, available[0].id);
    else if (available.length > 1) setChoosing(item);
  };
  const dialog = choosing && <div className="quick-buy-backdrop" onClick={() => setChoosing(null)}>
    <div className="quick-buy" role="dialog" aria-modal="true" aria-label={`Choose a colour for ${choosing.name}`} onClick={event => event.stopPropagation()}>
      <h3>Choose a colour</h3>
      <p>{choosing.name}</p>
      <div className="quick-buy-options">{choosing.variants.map(colour => <button key={colour.id} type="button" disabled={colour.stock < 1} onClick={() => addAndOpen(choosing, colour.id)}>
        <span className="colour-dot" style={{ background: colour.swatch }} aria-hidden="true" /><span>{colour.name}</span><small>{colour.stock < 1 ? "Sold out" : money(colour.price)}</small>
      </button>)}</div>
      <button className="quick-buy-close" type="button" onClick={() => setChoosing(null)}>Cancel</button>
    </div>
  </div>;
  return { start, dialog };
}

export function HomeHero() {
  const { hero } = useSiteContent().home;
  const { products } = useCart();
  const { start, dialog } = useQuickBuy();
  if (!hero.show) return null;
  const item = products.find(product => product.id === hero.productId);
  const price = item && cheapest(item);
  const hasImage = Boolean(hero.backgroundImage);
  const explore = hero.explore.link;
  return <section className={`home-hero${hasImage ? " with-image" : ""}${hero.desktopImage ? " has-wide" : ""}`} aria-labelledby="shop-title">
    {hasImage && <Image className="home-hero-image" src={hero.backgroundImage} alt="" fill priority sizes="100vw" />}
    {hasImage && hero.desktopImage && <Image className="home-hero-wide" src={hero.desktopImage} alt="" fill sizes="(min-width: 901px) 100vw, 1px" />}
    <div className="home-hero-copy">
      {hero.showEyebrow && hero.eyebrow && <p className="eyebrow">{hero.eyebrow}</p>}
      <h1 id="shop-title">{hero.showTitle ? hero.title : <span className="sr-only">Kalacar</span>}</h1>
      {hero.showDescription && hero.description && <p className="intro-copy">{hero.description}</p>}
      <div className="home-hero-buttons">
        {hero.buy.show && item && price && <button className="home-hero-buy" type="button" onClick={() => start(item)}>{hero.buy.label}{hero.buy.showPrice && <> · {money(price.price)}</>}</button>}
        {hero.explore.show && (/^https:/.test(explore) ? <a className="home-hero-explore" href={explore} target="_blank" rel="noopener noreferrer">{hero.explore.label}</a> : explore.startsWith("#") ? <a className="home-hero-explore" href={explore}>{hero.explore.label}</a> : <Link className="home-hero-explore" href={explore}>{hero.explore.label}</Link>)}
      </div>
    </div>
    {dialog}
  </section>;
}

function SectionHead({ id, showTitle, title, showDescription, description }: { id: string; showTitle: boolean; title: string; showDescription?: boolean; description?: string }) {
  if (!(showTitle && title) && !(showDescription && description)) return null;
  return <div className="home-section-head">{showTitle && title && <h2 id={id}>{title}</h2>}{showDescription && description && <p>{description}</p>}</div>;
}

export function FirstLaunch() {
  const section = useSiteContent().home.firstLaunch;
  const { products } = useCart();
  const { start, dialog } = useQuickBuy();
  const items = section.productIds.map(id => products.find(product => product.id === id)).filter((item): item is StoreItem => Boolean(item));
  if (!section.show || !items.length) return null;
  return <section className="home-section" aria-labelledby="first-launch-title">
    <SectionHead id="first-launch-title" {...section} />
    <ul className="home-product-grid">{items.map(item => { const price = cheapest(item); return <li key={item.id}>
      <Link href={`/products/${item.id}`} className="home-product-image"><Image src={item.image} alt={item.imageAlt} fill sizes="(max-width: 620px) 48vw, 300px" /></Link>
      <Link href={`/products/${item.id}`} className="home-product-name">{item.name}</Link>
      {price ? <p className="home-product-price">{money(price.price)}{price.originalPrice > price.price && <del>{money(price.originalPrice)}</del>}</p> : <p className="home-product-price">Out of stock</p>}
      <button className="home-quick-add" type="button" disabled={!price} onClick={() => start(item)}>{price ? "Add to bag" : "Out of stock"}</button>
    </li>; })}</ul>
    {dialog}
  </section>;
}

export function ComingSoon() {
  const section = useSiteContent().home.comingSoon;
  if (!section.show || !section.items.length) return null;
  return <section className="home-section" aria-labelledby="coming-soon-title">
    <SectionHead id="coming-soon-title" {...section} />
    <ul className="home-product-grid">{section.items.map((item, index) => <li key={`${item.name}-${index}`}>
      <div className="home-product-image">{item.image && <Image src={item.image} alt={item.name} fill sizes="(max-width: 620px) 48vw, 300px" />}</div>
      <p className="home-product-name">{item.name}</p>
      <p className="home-coming-soon">Coming Soon</p>
    </li>)}</ul>
  </section>;
}

export function Collections({ onChoose }: { onChoose: (name: string) => void }) {
  const { home, collections } = useSiteContent();
  if (!home.collections.show || !collections.length) return null;
  return <section className="home-section" aria-labelledby="collections-title">
    <SectionHead id="collections-title" {...home.collections} />
    <ul className={`home-collections count-${Math.min(collections.length, 5)}`}>{collections.map((category, index) => <li key={category.name}>
      <a className={category.image ? "has-image" : undefined} href="#catalogue" onClick={() => onChoose(category.name)}>
        {category.image && <span className="home-collection-image"><Image src={category.image} alt="" fill sizes={index === 0 ? "(max-width: 700px) 100vw, 50vw" : "(max-width: 700px) 50vw, 25vw"} /></span>}
        <span className="home-collection-name">{category.name}</span>
        <span className="home-collection-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg></span>
      </a>
    </li>)}</ul>
  </section>;
}

export function WhyChooseUs() {
  const section = useSiteContent().home.why;
  if (!section.show || !section.items.length) return null;
  return <section className="home-section home-why" aria-labelledby="why-title">
    <SectionHead id="why-title" {...section} />
    <ol className="home-why-list">{section.items.map((item, index) => <li key={`${item.title}-${index}`}>
      <span className="home-why-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      <div>{item.title && <h3>{item.title}</h3>}{item.text && <p>{item.text}</p>}</div>
    </li>)}</ol>
  </section>;
}

export function HomeReviews() {
  const { home, reviews } = useSiteContent();
  const section = home.reviews;
  const chosen = reviews.filter(review => review.showOnHome);
  const written = section.showText ? chosen.filter(review => review.text && !videoEmbed(review.videoUrl)) : [];
  const videos = section.showVideo ? chosen.filter(review => videoEmbed(review.videoUrl)) : [];
  const { instagram } = useSiteContent();
  if (!section.show || (!written.length && !videos.length)) return null;
  return <section className="home-section" aria-labelledby="home-reviews-title">
    <SectionHead id="home-reviews-title" {...section} />
    <VideoRow reviews={videos} />
    {written.length > 0 && <ul className="review-list">{written.map(review => <li className="review-card" key={review.id}><Stars rating={review.rating} /><p>{review.text}</p><small>{review.author}{review.city && `, ${review.city}`}</small></li>)}</ul>}
    {instagram.show && instagram.username && <div className="video-follow"><a href={instagramLink(instagram.username)} target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.6" cy="7.4" r=".8" fill="currentColor" stroke="none" /></svg>Follow @{instagram.username}</a></div>}
  </section>;
}

export function OurStory() {
  const section = useSiteContent().home.story;
  const showImage = section.showImage && section.image;
  if (!section.show || !(section.showText && section.text)) return null;
  return <section className="home-section home-story" aria-labelledby="story-title">
    {showImage && <div className="home-story-image"><Image src={section.image} alt={section.founder || "Kalacar founder"} fill sizes="(max-width: 700px) 100vw, 420px" /></div>}
    <div className="home-story-copy">
      {section.showTitle && section.title && <h2 id="story-title">{section.title}</h2>}
      <p>{section.text}</p>
      {section.showFounder && section.founder && <p className="home-story-founder">{section.founder}</p>}
    </div>
  </section>;
}

/** Follow band above the footer. Hidden until the owner sets the account in dashboard Settings. */
export function InstagramBand() {
  const { instagram } = useSiteContent();
  if (!instagram.show || !instagram.username) return null;
  return <section className="instagram-band" aria-label="Follow us on Instagram">
    <span className="instagram-band-icon"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.6" cy="7.4" r=".8" fill="currentColor" stroke="none" /></svg></span>
    <div className="instagram-band-text"><small>Follow our journey</small><b>@{instagram.username}</b></div>
    <a href={instagramLink(instagram.username)} target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.6" cy="7.4" r=".8" fill="currentColor" stroke="none" /></svg>Follow on Instagram<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5" /></svg></a>
  </section>;
}
