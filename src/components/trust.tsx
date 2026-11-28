"use client";

import { useState, type ReactNode } from "react";
import type { ProductPageContent, TrustIcon } from "@/data/site-content";
import { CameraIcon, ChatIcon, CheckMark, GiftIcon, HeartIcon, LockIcon, PhoneIcon, ShieldIcon, StarIcon, TruckIcon } from "@/components/icons";

/** The icon the owner picked in the dashboard; "none" shows nothing. */
export function Icon({ name, size = 22 }: { name: TrustIcon; size?: number }) {
  const icons: Record<TrustIcon, ReactNode> = {
    none: null, delivery: <TruckIcon size={size} />, breakage: <ShieldIcon size={size} />, secure: <LockIcon size={size} />, whatsapp: <ChatIcon size={size} />,
    photo: <CameraIcon size={size} />, gift: <GiftIcon size={size} />, check: <CheckMark size={size} />, star: <StarIcon size={size} />, heart: <HeartIcon size={size} />, phone: <PhoneIcon size={size} />,
  };
  return icons[name];
}

/** "UPI, GPay, PhonePe" → ["UPI", "GPay", "PhonePe"] */
const list = (marks: string) => marks.split(",").map(mark => mark.trim()).filter(Boolean).slice(0, 10);

/** The owner's promises with icons, under the Buy buttons. */
export function TrustStrip({ strip }: { strip: ProductPageContent["trustStrip"] }) {
  if (!strip.show || !strip.items.length) return null;
  return <ul className="trust-strip" aria-label="Why shop with Kalacar">{strip.items.map((item, index) => <li key={`${index}-${item.title}`}>
    {item.icon !== "none" && <span className="trust-icon" aria-hidden="true"><Icon name={item.icon} /></span>}
    <b>{item.title}</b>{item.text && <small>{item.text}</small>}
  </li>)}</ul>;
}

/** The trust strip's titles in one line, above the bag's Checkout button. */
export function TrustLine({ page }: { page: ProductPageContent }) {
  const { trustStrip } = page;
  if (!page.bagTrust.showLine || !trustStrip.items.length) return null;
  return <p className="trust-line">{trustStrip.items.map((item, index) => <span key={`${index}-${item.title}`}><CheckMark size={12} />{item.title}</span>)}</p>;
}

/** Names of the ways to pay, as small labels. Text, not brand artwork, so they stay sharp and honest. */
export function PaymentMarks({ marks }: { marks: string }) {
  const names = list(marks);
  if (!names.length) return null;
  return <span className="payment-marks" aria-label={`Pay with ${names.join(", ")}`}>{names.map(name => <span key={name} aria-hidden="true">{name}</span>)}</span>;
}

/** The Buy now button's inside: icon, words and payment labels. */
export function BuyNowLabel({ buyNow }: { buyNow: ProductPageContent["buyNow"] }) {
  return <><span className="buy-now-label"><Icon name={buyNow.icon} size={15} />{buyNow.label}</span>{buyNow.showMarks && <PaymentMarks marks={buyNow.marks} />}</>;
}

/** Just above Pay: who handles the payment and that card and UPI details never reach the shop. */
export function PaymentBox({ box }: { box: ProductPageContent["paymentBox"] }) {
  if (!box.show) return null;
  return <div className="payment-box">
    <p className="payment-box-title"><Icon name={box.icon} size={15} />{box.title}</p>
    <PaymentMarks marks={box.marks} />
    {box.note && <p className="payment-box-note">{box.note}</p>}
  </div>;
}

/** The Pay button's words, with {total} filled in. */
export function PayLabel({ pay, total }: { pay: ProductPageContent["payButton"]; total: string }) {
  return <><Icon name={pay.icon} size={15} />{pay.label.replaceAll("{total}", total)}</>;
}

/** "Secure checkout" with an (i) that explains how payment details are protected. */
export function SecureCheckoutBadge({ secure }: { secure: ProductPageContent["secureCheckout"] }) {
  const [open, setOpen] = useState(false);
  if (!secure.show) return null;
  return <div className="secure-checkout">
    <span className="secure-checkout-label"><Icon name={secure.icon} size={15} />{secure.label}</span>
    {secure.info && <button type="button" className="secure-checkout-info" aria-expanded={open} aria-controls="secure-checkout-text" aria-label="How we protect your payment" onClick={() => setOpen(value => !value)}>i</button>}
    {open && secure.info && <p id="secure-checkout-text" className="secure-checkout-text" role="note">{secure.info}</p>}
  </div>;
}

/** The free delivery row under the subtotal. */
export function FreeRows({ page }: { page: ProductPageContent }) {
  const row = page.bagTrust.delivery;
  return row.show ? <div className="free-row"><span>{row.label}</span><span>{row.value}</span></div> : null;
}
export function TaxNote({ page }: { page: ProductPageContent }) {
  return page.bagTrust.taxNote.show ? <p className="tax-note">{page.bagTrust.taxNote.text}</p> : null;
}
export function YouSave({ page, amount }: { page: ProductPageContent; amount: string }) {
  return page.bagTrust.youSave.show ? <p className="you-save">{page.bagTrust.youSave.text.replaceAll("{amount}", amount)}</p> : null;
}
