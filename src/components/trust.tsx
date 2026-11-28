"use client";

import { useState, type ReactNode } from "react";
import type { ProductPageContent, TrustIcon } from "@/data/site-content";
import { CameraIcon, ChatIcon, GiftIcon, LockIcon, ShieldIcon, TruckIcon } from "@/components/icons";

const ICONS: Record<TrustIcon, ReactNode> = {
  delivery: <TruckIcon />, breakage: <ShieldIcon />, secure: <LockIcon size={22} />, whatsapp: <ChatIcon />, photo: <CameraIcon />, gift: <GiftIcon size={22} />,
};

/** The owner's promises with icons, under the Buy buttons. */
export function TrustStrip({ strip }: { strip: ProductPageContent["trustStrip"] }) {
  if (!strip.show || !strip.items.length) return null;
  return <ul className="trust-strip" aria-label="Why shop with Kalacar">{strip.items.map((item, index) => <li key={`${index}-${item.title}`}>
    <span className="trust-icon" aria-hidden="true">{ICONS[item.icon]}</span>
    <b>{item.title}</b>{item.text && <small>{item.text}</small>}
  </li>)}</ul>;
}

/** "Free delivery · Breakage covered · Secure payment" above the bag's Checkout button. */
export function TrustLine({ strip }: { strip: ProductPageContent["trustStrip"] }) {
  if (!strip.show || !strip.items.length) return null;
  return <p className="trust-line">{strip.items.map((item, index) => <span key={`${index}-${item.title}`}><ShieldDot />{item.title}</span>)}</p>;
}
const ShieldDot = () => <svg aria-hidden="true" viewBox="0 0 16 16" width="13" height="13"><path d="M3.500 8.500 6.500 11.500 12.500 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;

const METHODS = ["UPI", "GPay", "PhonePe", "Paytm", "Visa", "Mastercard", "RuPay"];

/** Names of the ways to pay, as small labels. Text, not brand artwork, so they stay sharp and honest. */
export function PaymentMarks({ only }: { only?: string[] }) {
  const list = only ?? METHODS;
  return <span className="payment-marks" aria-label={`Pay with ${list.join(", ")}`}>{list.map(name => <span key={name} aria-hidden="true">{name}</span>)}</span>;
}

/** Just above Pay: who handles the payment and that card and UPI details never reach the shop. */
export function PaymentBox() {
  return <div className="payment-box">
    <p className="payment-box-title"><LockIcon /> Pay securely with Razorpay</p>
    <PaymentMarks />
    <p className="payment-box-note">You choose UPI, card or net banking in the next step. All payments are encrypted, and we never see or store your card or UPI details.</p>
  </div>;
}

/** "🔒 Secure checkout" with an (i) that explains how payment details are protected. */
export function SecureCheckoutBadge() {
  const [open, setOpen] = useState(false);
  return <div className="secure-checkout">
    <span className="secure-checkout-label"><LockIcon /> Secure checkout</span>
    <button type="button" className="secure-checkout-info" aria-expanded={open} aria-controls="secure-checkout-text" aria-label="How we protect your payment" onClick={() => setOpen(value => !value)}>i</button>
    {open && <p id="secure-checkout-text" className="secure-checkout-text" role="note">Payments are processed by Razorpay over an encrypted connection. We never see or store your card or UPI details, and we don&apos;t sell your information.</p>}
  </div>;
}

/** Rows under the subtotal: the free gift and free delivery, both ₹0. */
export function FreeRows({ page }: { page: ProductPageContent }) {
  return <>
    {page.freeGift.show && <div className="free-row"><span><GiftIcon size={15} /> Free gift: {page.freeGift.name}</span><span>FREE</span></div>}
    {page.delivery.free.show && <div className="free-row"><span>Delivery</span><span>FREE</span></div>}
  </>;
}
export const TaxNote = () => <p className="tax-note">Inclusive of all taxes</p>;
