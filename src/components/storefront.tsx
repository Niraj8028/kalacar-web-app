"use client";

import { PolicyLinks } from "@/components/policy-links";
import { Collections, ComingSoon, FirstLaunch, HomeHero, HomeReviews, OurStory, WhyChooseUs } from "@/components/home-sections";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSiteContent } from "@/components/site-content-provider";
import ThemeToggle from "@/components/theme-toggle";
import { AddToBagButton, CartLink, useCart } from "@/components/cart-provider";
import { ArrowRight, Search, UserCircle } from "@/components/icons";

export default function Storefront() {
  const { home } = useSiteContent();
  const { products, catalogueLoading, catalogueError } = useCart();
  const [activeFilter, setActiveFilter] = useState("All murtis");
  const [search, setSearch] = useState("");

  const deityFilters = useMemo(() => ["All murtis", ...new Set(products.map(item => item.deity))], [products]);
  const categories = useMemo(() => [...new Set(products.map(item => item.deity))], [products]);
  const selectedFilter = deityFilters.includes(activeFilter) ? activeFilter : "All murtis";

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((item) => {
      const matchesFilter = selectedFilter === "All murtis" || item.deity === selectedFilter;
      const matchesSearch = !query || `${item.name} ${item.deity}`.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [products, selectedFilter, search]);

  return (
    <main className="storefront" id="top">
      {process.env.NODE_ENV === "development" && <p className="local-data-notice" role="note">Local development · Catalogue values come from the temporary database. Confirm product facts, prices, and stock before launch. Payments remain in test mode.</p>}
      <div className="top-note">Small devotional murtis</div>

      <div className={home.hero.show && home.hero.backgroundImage ? "home-top over-photo" : "home-top"}>
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
          {categories.map(category => <a key={category} href="#catalogue" onClick={() => setActiveFilter(category)}>{category}</a>)}
        </nav>

        <div className="header-tools">
          <Link className="account-link" href="/account" aria-label="Your account"><UserCircle size={20} /><span>Account</span></Link>
          <label className="header-search">
            <Search />
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

      <HomeHero />
      </div>
      <FirstLaunch />
      <ComingSoon />
      <Collections onChoose={setActiveFilter} />

      <section className="catalogue-section" id="catalogue" aria-labelledby="catalogue-title">
        <div className="catalogue-heading">
          <div>
            <p className="eyebrow">SHOP BY CATEGORY</p>
            <h2 id="catalogue-title">Murtis for everyday spaces</h2>
          </div>
          <p className="result-count">{catalogueLoading ? "Loading…" : catalogueError ? "Unavailable" : `${visibleItems.length} ${visibleItems.length === 1 ? "item" : "items"}`}</p>
        </div>

        <div className="catalogue-controls">
          <div className="filter-list" role="group" aria-label="Filter by category">
            {deityFilters.map((filter) => (
              <button
                className={selectedFilter === filter ? "filter-chip active" : "filter-chip"}
                type="button"
                key={filter}
                onClick={() => setActiveFilter(filter)}
                aria-pressed={selectedFilter === filter}
              >
                {filter}
              </button>
            ))}
          </div>
          <p className="reference-note">Prices and stock from the current catalogue.</p>
        </div>

        {catalogueError ? <div className="empty-results" role="alert"><p>{catalogueError}</p></div> : catalogueLoading ? <div className="empty-results" role="status"><p>Loading the current catalogue…</p></div> : visibleItems.length > 0 ? (
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
                    {(() => { const save = item.originalPrice > item.price ? Math.round((1 - item.price / item.originalPrice) * 100) : 0; return (item.badge || save > 0) ? <span className="card-badges">{item.badge && <span className="badge-chip">{item.badge}</span>}{save > 0 && <span className="badge-chip save">Save {save}%</span>}</span> : null; })()}
                  </Link>
                </div>
                <div className="product-info">
                  <p className="product-deity">{item.deity}</p>
                  <h3>{item.name}</h3>
                  {item.tagline ? <p className="product-placement">{item.tagline}</p> : item.placement && <p className="product-placement">{item.placement}</p>}
                  {item.variants.length > 1 && <p className="card-swatches" aria-label={`${item.variants.length} colours: ${item.variants.map(v => v.name).join(", ")}`}>{item.variants.map(v => <span key={v.id} className="colour-dot" style={{ background: v.swatch }} title={v.name} aria-hidden="true" />)}<small>{item.variants.length} colours</small></p>}
                  <Link className="details-link" href={`/products/${item.id}`}>View details <ArrowRight /></Link>
                  <div className="product-buy-row">
                    <span className="product-price-block"><strong>{new Set(item.variants.map(v => v.price)).size > 1 ? "from " : ""}₹{item.price}</strong>{item.originalPrice > item.price && <del>₹{item.originalPrice}</del>}<small>{item.stock < 1 ? "out of stock" : item.stock <= 3 ? `only ${item.stock} left` : "in stock"}</small></span>
                    {item.variants.length > 1 ? <Link className="add-button choose-colour" href={`/products/${item.id}`}>Choose colour</Link> : <AddToBagButton id={item.id} variantId={item.variants[0]?.id} disabled={item.stock < 1} />}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-results">
            <p>{products.length ? "No murtis match that search." : "No products have been added yet."}</p>
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
          <p>Browse the current Kalacar catalogue.</p>
        </div>
      </section>

      <WhyChooseUs />
      <HomeReviews />
      <OurStory />

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
        <p>Prices and availability reflect the current catalogue.</p>
        <a className="footer-whatsapp" href="https://wa.me/918830646308?text=Hi%20Kalacar%2C%20I%20have%20a%20question%20about%20an%20order." target="_blank" rel="noreferrer">WhatsApp · +91 88306 46308</a>
        <PolicyLinks />
      </footer>
    </main>
  );
}
