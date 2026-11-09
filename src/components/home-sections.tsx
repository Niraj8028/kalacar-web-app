"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { useSiteContent } from "@/components/site-content-provider";
import { Stars, VideoRow } from "@/components/reviews";
import { instagramLink, reviewSummary, videoEmbed } from "@/data/site-content";
import type { HeroSlide } from "@/data/site-content";
import type { StoreItem } from "@/data/catalogue";
import { useLogo } from "@/components/shop-logo";
import { WHATSAPP_URL } from "@/components/policy-links";

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

function HeroSlideView({ slide, index, total, active, dark, onBuy }: { slide: HeroSlide; index: number; total: number; active: boolean; dark: boolean; onBuy: (item: StoreItem) => void }) {
  const { products } = useCart();
  const item = products.find(product => product.id === slide.productId);
  const price = item && cheapest(item);
  const hasImage = Boolean(slide.backgroundImage);
  const explore = slide.explore.link;
  const Title = index === 0 ? "h1" : "h2";
  return <section className={`home-hero${hasImage || dark ? " with-image" : ""}${hasImage && slide.desktopImage ? " has-wide" : ""}`} aria-labelledby={`hero-title-${index}`} aria-roledescription={total > 1 ? "slide" : undefined} aria-label={total > 1 ? `${index + 1} of ${total}` : undefined} aria-hidden={total > 1 && !active ? true : undefined} inert={total > 1 && !active ? true : undefined}>
    {hasImage && <Image className="home-hero-image" src={slide.backgroundImage} alt="" fill priority={index === 0} sizes="100vw" />}
    {hasImage && slide.desktopImage && <Image className="home-hero-wide" src={slide.desktopImage} alt="" fill priority={index === 0} sizes="(min-width: 901px) 100vw, 1px" />}
    <div className="home-hero-copy">
      {slide.showEyebrow && slide.eyebrow && <p className="eyebrow">{slide.eyebrow}</p>}
      <Title id={`hero-title-${index}`}>{slide.showTitle ? slide.title : <span className="sr-only">Kalacar</span>}</Title>
      {slide.showDescription && slide.description && <p className="intro-copy">{slide.description}</p>}
      <div className="home-hero-buttons">
        {slide.buy.show && item && price && <button className="home-hero-buy" type="button" onClick={() => onBuy(item)}>{slide.buy.label}{slide.buy.showPrice && <> · {money(price.price)}</>}</button>}
        {slide.explore.show && (/^https:/.test(explore) ? <a className="home-hero-explore" href={explore} target="_blank" rel="noopener noreferrer">{slide.explore.label}</a> : explore.startsWith("#") ? <a className="home-hero-explore" href={explore}>{slide.explore.label}</a> : <Link className="home-hero-explore" href={explore}>{slide.explore.label}</Link>)}
      </div>
    </div>
  </section>;
}

/** Home page hero. Several slides swipe on phones, and also move with arrows, dots and an optional timer. */
export function HomeHero() {
  const { hero } = useSiteContent().home;
  const { start, dialog } = useQuickBuy();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const drag = useRef<number | null>(null);
  const dragged = useRef(false);
  const slides = hero.slides;
  const total = slides.length;
  const go = useCallback((index: number) => {
    const element = track.current;
    if (!element || !total) return;
    const next = (index + total) % total;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollTo({ left: next * element.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }, [total]);
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const onScroll = () => setActive(Math.min(total - 1, Math.round(element.scrollLeft / Math.max(1, element.clientWidth))));
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, [total]);
  useEffect(() => {
    if (!hero.show || !hero.autoplay || total < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => { if (!document.hidden) go(active + 1); }, hero.interval * 1000);
    return () => window.clearInterval(timer);
  }, [hero.show, hero.autoplay, hero.interval, total, paused, active, go]);
  // Phones and trackpads swipe natively; a mouse drags left or right to change slide.
  function onDragStart(event: React.PointerEvent) { if (event.pointerType === "mouse" && event.button === 0) drag.current = event.clientX; }
  function onDragEnd(event: React.PointerEvent) {
    if (drag.current === null) return;
    const moved = event.clientX - drag.current;
    drag.current = null;
    if (Math.abs(moved) < 40) return;
    dragged.current = true;
    go(active + (moved < 0 ? 1 : -1));
  }
  if (!hero.show || !total) return null;
  const dark = slides.some(slide => slide.backgroundImage);
  if (total === 1) return <><HeroSlideView slide={slides[0]} index={0} total={1} active dark={dark} onBuy={start} />{dialog}</>;
  return <div className="hero-carousel" role="region" aria-roledescription="carousel" aria-label="Featured murtis"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} onTouchStart={() => setPaused(true)}>
    <div className="hero-track" ref={track} onPointerDown={onDragStart} onPointerUp={onDragEnd} onPointerCancel={() => { drag.current = null; }} onClickCapture={event => { if (dragged.current) { event.preventDefault(); event.stopPropagation(); dragged.current = false; } }}>
      {slides.map((slide, index) => <HeroSlideView key={index} slide={slide} index={index} total={total} active={index === active} dark={dark} onBuy={start} />)}
    </div>
    <div className="hero-dots">{slides.map((_, index) => <button key={index} type="button" className={index === active ? "active" : ""} aria-label={`Show slide ${index + 1}`} aria-current={index === active ? "true" : undefined} onClick={() => go(index)} />)}</div>
    {dialog}
  </div>;
}

const WhatsAppIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#25d366" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Z" /><path fill="#fff" d="M17.2 14.4c-.3-.1-1.7-.8-1.9-.9s-.5-.1-.7.1-.8 1-.9 1.2-.3.2-.6.1a7.6 7.6 0 0 1-3.8-3.3c-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5l-.9-2c-.2-.5-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.4 13.4 0 0 0 5.2 4.6c1.9.8 2.7.9 3.7.7a3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3Z" /></svg>;

/** One featured murti under the hero. Heading, photo and switches come from the dashboard; name, price, rating and stock come from the product itself. */
export function ProductSpotlight() {
  const { home, reviews } = useSiteContent();
  const spot = home.spotlight;
  const { products, add, canAdd } = useCart();
  const router = useRouter();
  const logo = useLogo();
  const item = spot?.show ? products.find(product => product.id === spot.productId) : undefined;
  if (!spot || !item) return null;
  const price = cheapest(item);
  const save = price && price.originalPrice > price.price ? Math.round((1 - price.price / price.originalPrice) * 100) : 0;
  const summary = reviewSummary(reviews.filter(review => review.productId === item.id));
  const available = item.variants.filter(colour => colour.stock > 0);
  const buyNow = () => {
    if (available.length !== 1) { router.push(`/products/${item.id}`); return; }
    if (canAdd(item.id, available[0].id)) add(item.id, available[0].id, 1);
    router.push("/cart");
  };
  const hasHead = (spot.showTitle && spot.title) || (spot.showDescription && spot.description);
  return <section className="spotlight" aria-labelledby="spotlight-name">
    <div className="spotlight-inner">
      {hasHead && <div className="spotlight-head">
        {spot.showTitle && spot.title && <h2>{spot.title}</h2>}
        {spot.showDescription && spot.description && <p>{spot.description}</p>}
      </div>}
      {spot.showLogo && <div className="spotlight-logo"><Image src={logo.src} alt="Kalacar" width={220} height={94} className={logo.className.replace(" sized", "")} /></div>}
      <div className="spotlight-visual"><Image src={spot.image || item.image} alt={item.imageAlt || item.name} fill sizes="(max-width: 900px) 92vw, 760px" /></div>
      <div className="spotlight-copy">
        {item.badge && <span className="spotlight-badge">{item.badge}</span>}
        <h3 id="spotlight-name"><Link href={`/products/${item.id}`}>{item.name}</Link></h3>
        {item.tagline && <p className="spotlight-text">{item.tagline}</p>}
        {price ? <p className="spotlight-price"><strong>{money(price.price)}</strong>{save > 0 && <><del>{money(price.originalPrice)}</del><span>(Save {save}%)</span></>}</p> : null}
        <p className="spotlight-meta">
          {summary && <span className="spotlight-rating"><Stars rating={summary.average} /> {summary.average.toFixed(1)} ({summary.count} {summary.count === 1 ? "review" : "reviews"})</span>}
          <span className={price ? "spotlight-stock" : "spotlight-stock out"}>{price ? "In stock" : "Out of stock"}</span>
        </p>
        <div className="spotlight-buttons">
          <button className="spotlight-buy" type="button" disabled={!price} onClick={buyNow}>Buy now</button>
          {spot.whatsapp.show && <a className="spotlight-order" href={`${WHATSAPP_URL}?text=${encodeURIComponent(`Hi Kalacar, I'd like to order ${item.name}.`)}`} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> {spot.whatsapp.label}</a>}
        </div>
      </div>
    </div>
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
