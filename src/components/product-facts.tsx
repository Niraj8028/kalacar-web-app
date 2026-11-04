import type { ReactNode } from "react";
import { DELIVERY_ESTIMATE, DELIVERY_NOTE } from "@/lib/store-info";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const icons: Record<string, ReactNode> = {
  height: <><path d="M12 3v18M8 6.5 12 3l4 3.5M8 17.5 12 21l4-3.5" {...stroke} /></>,
  size: <><path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z M4 8.5 12 13l8-4.5M12 13v7" {...stroke} /></>,
  material: <><path d="m12 4 8 4-8 4-8-4z M4 12l8 4 8-4 M4 16l8 4 8-4" {...stroke} /></>,
  finish: <><path d="M14.5 4.5 19.5 9.5l-7 7-5-5z M7.5 11.5 4 19.5l8-3.5" {...stroke} /></>,
  weight: <><path d="M6 9h12l2 11H4z M9.5 9a2.5 2.5 0 1 1 5 0" {...stroke} /></>,
  care: <><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" {...stroke} /></>,
  colour: <><circle cx="12" cy="12" r="8" {...stroke} /><path d="M12 4a8 8 0 0 0 0 16 2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 1 0-5" {...stroke} /></>,
  other: <><circle cx="12" cy="12" r="8" {...stroke} /><path d="M12 11v5M12 8h.01" {...stroke} /></>,
};
/** Picks an icon from the label the owner typed (Height, Material, Finish, Weight, Size…). */
function iconFor(label: string) {
  const l = label.toLowerCase();
  if (/height|tall/.test(l)) return icons.height;
  if (/size|dimension|width|depth|base/.test(l)) return icons.size;
  if (/material|resin|made of|marble/.test(l)) return icons.material;
  if (/finish|paint|coat/.test(l)) return icons.finish;
  if (/weight|wt/.test(l)) return icons.weight;
  if (/care|clean/.test(l)) return icons.care;
  if (/colou?r/.test(l)) return icons.colour;
  return icons.other;
}

export function DeliveryLine() {
  return <p className="delivery-line"><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path d="M3 7h11v9H3z M14 10h4l3 3v3h-7 M7 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01" {...stroke} /></svg><span><b>Delivered in {DELIVERY_ESTIMATE}.</b> {DELIVERY_NOTE}</span></p>;
}

export function ProductHighlights({ items }: { items: string[] }) {
  if (!items.length) return null;
  return <ul className="product-highlights" aria-label="Highlights">{items.map(item => <li key={item}><svg aria-hidden="true" viewBox="0 0 16 16" width="15" height="15"><path d="M3.5 8.5 6.5 11.5 12.5 5" {...stroke} strokeWidth={1.8} /></svg>{item}</li>)}</ul>;
}

export function SpecCards({ specs }: { specs: Array<{ label: string; value: string }> }) {
  if (!specs.length) return null;
  return <section className="spec-cards" aria-labelledby="spec-cards-title">
    <h2 id="spec-cards-title">Specifications &amp; craftsmanship</h2>
    <dl>{specs.map(spec => <div className="spec-card" key={`${spec.label}-${spec.value}`}>
      <span className="spec-icon"><svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22">{iconFor(spec.label)}</svg></span>
      <dt>{spec.label}</dt><dd>{spec.value}</dd>
    </div>)}</dl>
  </section>;
}
