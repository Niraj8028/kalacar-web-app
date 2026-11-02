import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";

const collections = [
  { number: "01", name: "Ganpati", note: "Ganesha murtis", symbol: "श्री" },
  { number: "02", name: "Krishna", note: "Krishna murtis", symbol: "कृष्ण" },
  { number: "03", name: "Shankar", note: "Shiva murtis", symbol: "ॐ" },
];

export default function Home() {
  return (
    <main>
      <div className="announcement">
        <span>Small devotional idols</span><span className="announcement-dot">·</span><span>Kalacar</span>
      </div>
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Kalacar home">kalacar<i>.</i><small>DEVOTIONAL IDOLS</small></Link>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#collections">Shop</a><a href="#approach">Our approach</a>
        </nav>
        <div className="header-actions"><ThemeToggle /><a href="#account" className="account-link">Account ↗</a></div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-mark" /> A considered collection</p>
          <h1 id="hero-title">A little presence.<br /><em>A lot of meaning.</em></h1>
          <p className="hero-description">Small 3D-printed murtis of Ganpati, Krishna, and Shankar, presented with the details that help you choose.</p>
          <a className="primary-link" href="#collections">Explore the collection <span>↗</span></a>
          <p className="hero-footnote">Owner product photography and exact catalogue details will be added in the next step.</p>
        </div>
        <div className="hero-art" aria-label="Decorative placeholder; original product photography is pending">
          <div className="art-label"><span>01 / KALACAR</span><span>PRODUCT IMAGE PENDING</span></div>
          <div className="art-halo" />
          <div className="art-form"><div className="art-form-head" /><div className="art-form-body" /><div className="art-form-base" /></div>
          <div className="art-caption"><span>Form, finish, and scale</span><span>Original product photo pending</span></div>
        </div>
      </section>

      <section className="collection-section" id="collections" aria-labelledby="collections-title">
        <div className="section-heading">
          <div><p className="eyebrow">THE COLLECTION</p><h2 id="collections-title">Find the one that feels right.</h2></div>
          <p className="section-note">A focused selection of small devotional idols.</p>
        </div>
        <div className="collection-grid">
          {collections.map((collection) => (
            <a className="collection-card" href="#catalogue" key={collection.number}>
              <span className="collection-number">{collection.number}</span>
              <span className="collection-symbol" aria-hidden="true">{collection.symbol}</span>
              <span className="collection-name">{collection.name}</span>
              <span className="collection-note">{collection.note}</span>
              <span className="collection-arrow" aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </section>

      <section className="featured-section" id="catalogue" aria-labelledby="featured-title">
        <div className="section-heading">
          <div><p className="eyebrow">A FIRST LOOK</p><h2 id="featured-title">Made to be seen up close.</h2></div>
          <span className="preview-tag">Sample layout</span>
        </div>
        <div className="product-grid">
          {["Ganpati", "Krishna", "Shankar"].map((name, index) => (
            <article className="product-card" key={name}>
              <div className={"product-placeholder product-placeholder-" + (index + 1)}>
                <span>Owner product photo needed</span><span className="placeholder-index">0{index + 1}</span>
              </div>
              <div className="product-meta"><div><h3>{name}</h3><p>Sample catalogue item</p></div><span className="product-arrow">↗</span></div>
              <p className="product-price-note">Price and dimensions to be confirmed</p>
            </article>
          ))}
        </div>
      </section>

      <section className="approach-section" id="approach">
        <p className="eyebrow">THE KALACAR APPROACH</p>
        <h2>Clear details.<br /><em>Careful choices.</em></h2>
        <p>Product pages will show owner-confirmed dimensions, material, finish, and care information, so you know what you are choosing.</p>
        <a className="text-link" href="#collections">Browse the collection <span>→</span></a>
      </section>

      <footer className="site-footer" id="account">
        <Link className="wordmark footer-wordmark" href="/">kalacar<i>.</i><small>DEVOTIONAL IDOLS</small></Link>
        <p>A small, focused shop for devotional idols.</p>
        <div className="footer-links"><a href="#collections">Shop</a><a href="#approach">Our approach</a><span>Accounts and order tracking will be added in a later step.</span></div>
        <small className="copyright">© {new Date().getFullYear()} Kalacar</small>
      </footer>
    </main>
  );
}
