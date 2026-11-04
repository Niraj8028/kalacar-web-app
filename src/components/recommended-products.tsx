import Image from "next/image";
import Link from "next/link";
import type { StoreItem } from "@/data/catalogue";

const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/**
 * Picks up to `limit` other products customers can buy: same deity first, then the rest,
 * keeping the catalogue's order (newest first) within each group.
 */
export function pickRecommendations(current: StoreItem, all: StoreItem[], limit = 4) {
  const buyable = all.filter(p => p.id !== current.id && p.variants.some(v => v.stock > 0));
  const sameDeity = buyable.filter(p => p.deity.trim().toLowerCase() === current.deity.trim().toLowerCase());
  const others = buyable.filter(p => !sameDeity.includes(p));
  return [...sameDeity, ...others].slice(0, limit);
}

export function RecommendedProducts({ current, products }: { current: StoreItem; products: StoreItem[] }) {
  const picks = pickRecommendations(current, products);
  if (!picks.length) return null;
  return <section className="recommended" aria-labelledby="recommended-title">
    <div className="recommended-head"><p className="eyebrow">MORE TO EXPLORE</p><h2 id="recommended-title">You may also like</h2></div>
    <ul className="recommended-grid">{picks.map(item => {
      const visible = item.variants.filter(v => v.stock > 0);
      const cheapest = [...visible].sort((a, b) => a.price - b.price)[0] ?? item.variants[0];
      const fromPrice = new Set(item.variants.map(v => v.price)).size > 1;
      const save = cheapest.originalPrice > cheapest.price ? Math.round((1 - cheapest.price / cheapest.originalPrice) * 100) : 0;
      return <li key={item.id}><Link className="recommended-card" href={`/products/${item.id}`}>
        <span className="recommended-image"><Image src={item.image} alt="" fill sizes="(max-width: 620px) 50vw, 25vw" />{(item.badge || save > 0) && <span className="card-badges">{item.badge && <span className="badge-chip">{item.badge}</span>}{save > 0 && <span className="badge-chip save">Save {save}%</span>}</span>}</span>
        <span className="recommended-info">
          <small>{item.deity}</small>
          <b>{item.name}</b>
          <span className="recommended-price">{fromPrice ? "from " : ""}{money(cheapest.price)}{save > 0 && <del>{money(cheapest.originalPrice)}</del>}</span>
          {item.variants.length > 1 && <span className="card-swatches" aria-label={`${item.variants.length} colours`}>{item.variants.map(v => <span key={v.id} className="colour-dot" style={{ background: v.swatch }} aria-hidden="true" />)}</span>}
        </span>
      </Link></li>;
    })}</ul>
  </section>;
}
