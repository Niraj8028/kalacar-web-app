"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { CloseMark, GiftIcon } from "@/components/icons";

export const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

/** Bag items, used by both the drawer and the bag page, so they always show and change the same bag. */
export function BagLines({ onNavigate }: { onNavigate?: () => void }) {
  const { resolved, setQuantity, remove, changeColour, canAdd } = useCart();
  return <div className="bag-lines">
    {resolved.map(({ key, product: item, colour, line }) => <article className="bag-line" key={key}>
      <Link className="bag-line-image" href={`/products/${item.id}?colour=${colour.id}`} onClick={onNavigate}>
        <Image src={colour.gallery[0] ?? item.image} alt={`${item.name}${item.variants.length > 1 ? ` in ${colour.name}` : ""}`} fill sizes="88px" />
      </Link>
      <div className="bag-line-info">
        <h3><Link href={`/products/${item.id}?colour=${colour.id}`} onClick={onNavigate}>{item.name}</Link></h3>
        {item.variants.length > 1 && <label className="cart-colour"><span className="colour-dot" style={{ background: colour.swatch }} aria-hidden="true" /><span className="sr-only">Colour</span>
          <select aria-label={`Colour for ${item.name}`} value={colour.id} onChange={e => changeColour(key, e.target.value)}>
            {item.variants.map(option => <option key={option.id} value={option.id} disabled={option.stock < 1 && option.id !== colour.id}>{option.name}{option.stock < 1 ? " — sold out" : option.price !== colour.price ? ` — ${money(option.price)}` : ""}</option>)}
          </select></label>}
        <p className="bag-line-price">{money(colour.price)}{colour.originalPrice > colour.price && <del>{money(colour.originalPrice)}</del>}</p>
        {colour.stock < line.quantity
          ? <p className="cart-stock-warning" role="alert">Only {colour.stock} left in {colour.name}. Lower the quantity to check out.</p>
          : !canAdd(item.id, colour.id) && <p className="bag-limit-note">That&apos;s all we have in stock.</p>}
        <div className="quantity-control" role="group" aria-label={`Quantity for ${item.name}`}>
          <button type="button" onClick={() => setQuantity(key, line.quantity - 1)} aria-label="Decrease quantity">−</button>
          <span>{line.quantity}</span>
          <button type="button" disabled={!canAdd(item.id, colour.id)} onClick={() => setQuantity(key, line.quantity + 1)} aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div className="bag-line-side">
        <button className="bag-remove" type="button" aria-label={`Remove ${item.name}`} onClick={() => remove(key)}><CloseMark size={14} /></button>
        <strong>{money(colour.price * line.quantity)}</strong>
      </div>
    </article>)}
  </div>;
}

export function GiftChoice() {
  const { giftOffer, wantGift, setWantGift } = useCart();
  if (!giftOffer) return null;
  return <label className={`gift-option${wantGift ? " selected" : ""}`}>
    <input type="checkbox" checked={wantGift} onChange={e => setWantGift(e.target.checked)} />
    <GiftIcon />
    <span><b>{giftOffer.title}</b>{giftOffer.description && <small>{giftOffer.description}</small>}</span>
    <strong>{giftOffer.price > 0 ? `+${money(giftOffer.price)}` : "Free"}</strong>
  </label>;
}
