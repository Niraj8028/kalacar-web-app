"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ThemeToggle from "@/components/theme-toggle";
import { AddToBagButton, CartLink } from "@/components/cart-provider";
import { deityFilters, storeItems, type Deity } from "@/data/catalogue";

export default function Storefront() {
  const [products, setProducts] = useState(storeItems);
  const [activeFilter, setActiveFilter] = useState<"All murtis" | Deity>("All murtis");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { products: Array<(typeof storeItems)[number] & { stock: number }> };
        if (alive && data.products.length) setProducts(data.products);
      } catch { /* Keep the clearly labeled local preview catalogue if the API is unavailable. */ }
    };
    void refresh();
    const timer = window.setInterval(refresh, 2500);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((item) => {
      const matchesFilter = activeFilter === "All murtis" || item.deity === activeFilter;
      const matchesSearch = !query || `${item.name} ${item.deity}`.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [products, activeFilter, search]);

  return (
    <main className="storefront" id="top">
      <div className="top-note">
        Small murtis for car dashboards, Devghars, and personal mandirs
      </div>

      <header className="shop-header">
        <Link className="wordmark" href="/" aria-label="Kalacar home">
          <Image
            src="/images/kalakar-logo.png"
            alt="Kalacar — Small Devotional Murtis"
            width={220}
            height={94}
            className="brand-logo"
            priority
          />
        </Link>

        <nav className="header-nav" aria-label="Shop categories">
          <a href="#catalogue" onClick={() => setActiveFilter("All murtis")}>Shop all</a>
          <a href="#catalogue" onClick={() => setActiveFilter("Ganpati")}>Ganpati</a>
          <a href="#catalogue" onClick={() => setActiveFilter("Sri Krishna")}>Sri Krishna</a>
          <a href="#catalogue" onClick={() => setActiveFilter("Swami Samarth")}>Swami Samarth</a>
        </nav>

        <div className="header-tools">
          <Link className="account-link" href="/account">Account</Link>
          <label className="header-search">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Search murtis"
              type="search"
              placeholder="Search murtis"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <ThemeToggle />
          <CartLink />
        </div>
      </header>

      <section className="shop-intro" aria-labelledby="shop-title">
        <div className="breadcrumb"><a href="#top">Home</a><span>/</span><span>Murtis</span></div>
        <div className="intro-row">
          <div>
            <p className="eyebrow">THE KALACAR SHOP</p>
            <h1 id="shop-title">Small murtis,<br /><em>close to home.</em></h1>
          </div>
          <p className="intro-copy">
            A focused collection of small devotional murtis for your car, Devghar, or a quiet corner at home.
          </p>
        </div>
      </section>

      <section className="catalogue-section" id="catalogue" aria-labelledby="catalogue-title">
        <div className="catalogue-heading">
          <div>
            <p className="eyebrow">SHOP BY DEITY</p>
            <h2 id="catalogue-title">Murtis for everyday spaces</h2>
          </div>
          <p className="result-count">{visibleItems.length} {visibleItems.length === 1 ? "item" : "items"}</p>
        </div>

        <div className="catalogue-controls">
          <div className="filter-list" role="group" aria-label="Filter by deity">
            {deityFilters.map((filter) => (
              <button
                className={activeFilter === filter ? "filter-chip active" : "filter-chip"}
                type="button"
                key={filter}
                onClick={() => setActiveFilter(filter)}
                aria-pressed={activeFilter === filter}
              >
                {filter}
              </button>
            ))}
          </div>
          <p className="reference-note">Demo prices and offers shown for preview only.</p>
        </div>

        {visibleItems.length > 0 ? (
          <div className="product-grid">
            {visibleItems.map((item, index) => (
              <article className="product-card" key={item.id}>
                <div className="product-image-wrap">
                  <Link href={`/products/${item.id}`} className="product-image-link" aria-label={`View ${item.name}`}>
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      fill
                      sizes="(max-width: 620px) 48vw, (max-width: 960px) 31vw, 360px"
                      className="product-image"
                      priority={index < 3}
                    />
                    <span className="image-tag">VIEW MURTI</span>
                  </Link>
                  {item.originalPrice > item.price && <span className="discount-tag">DEMO OFFER</span>}
                </div>
                <div className="product-info">
                  <p className="product-deity">{item.deity}</p>
                  <h3>{item.name}</h3>
                  <p className="product-placement">{item.placement}</p>
                  <Link className="details-link" href={`/products/${item.id}`}>View details <span aria-hidden="true">→</span></Link>
                  <div className="product-buy-row">
                    <span className="product-price-block"><strong>₹{item.price}</strong>{item.originalPrice > item.price && <del>₹{item.originalPrice}</del>}<small>demo price · {"stock" in item ? (item.stock ? `${item.stock} available` : "out of stock") : "preview stock"}</small></span>
                    <AddToBagButton id={item.id} disabled={"stock" in item ? item.stock < 1 : false} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-results">
            <p>No murtis match that search.</p>
            <button type="button" onClick={() => { setSearch(""); setActiveFilter("All murtis"); }}>
              Show all murtis
            </button>
          </div>
        )}
      </section>

      <section className="placement-note" aria-label="Where to keep a murti">
        <span className="placement-mark" aria-hidden="true">श्री</span>
        <div>
          <p className="eyebrow">MADE FOR YOUR SPACE</p>
          <h2>A little presence, wherever you place it.</h2>
          <p>Choose a small murti for your car dashboard, Devghar, or personal mandir.</p>
        </div>
      </section>

      <footer className="shop-footer">
        <Link className="wordmark footer-wordmark" href="/" aria-label="Kalacar home">
          <Image
            src="/images/kalakar-logo.png"
            alt="Kalacar — Small Devotional Murtis"
            width={180}
            height={77}
            className="brand-logo"
          />
        </Link>
        <p>Demo prices and discounts are sample values. Product photos, final pricing, availability, and payment will be confirmed before launch.</p>
        <a className="footer-whatsapp" href="https://wa.me/918830646308?text=Hi%20Kalacar%2C%20I%20have%20a%20question%20about%20an%20order." target="_blank" rel="noreferrer">WhatsApp · +91 88306 46308</a>
      </footer>
    </main>
  );
}
