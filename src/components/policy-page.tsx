import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "@/components/icons";

export const POLICY_LINKS = [
  { href: "/shipping", label: "Shipping" },
  { href: "/returns", label: "Returns and refunds" },
  { href: "/safe-transit", label: "Safe Transit Guarantee" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];
export const WHATSAPP_URL = "https://wa.me/918830646308";

/** Drafts stay out of search results until the owner has reviewed them. */
export const policyMetadata = (title: string, description: string): Metadata => ({ title: `${title} — Kalacar`, description, robots: { index: false, follow: false } });

/** Marks something only the owner can decide. Search for "To confirm" before launch: none may remain. */
export function Confirm({ children }: { children: ReactNode }) { return <mark className="policy-confirm">To confirm: {children}</mark>; }

export function PolicyLinks({ className = "policy-links" }: { className?: string }) {
  return <nav className={className} aria-label="Store policies">{POLICY_LINKS.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>;
}

export function PolicyPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <main className="policy-page">
    <header className="detail-header"><Link className="wordmark" href="/">kalacar<span>.</span><small>SMALL DEVOTIONAL MURTIS</small></Link><Link className="back-to-shop" href="/#catalogue"><ArrowLeft /> Back to all murtis</Link></header>
    <article className="policy-content">
      <p className="eyebrow">STORE POLICY</p>
      <h1>{title}</h1>
      <p className="policy-intro">{intro}</p>
      <p className="policy-draft" role="note"><b>Draft — owner review before launch.</b> Highlighted items are not decided yet and are not promises.</p>
      {children}
      <section><h2>Questions</h2><p>Message us on <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp at +91 88306 46308</a>. Please include your order number if you have one.</p></section>
    </article>
    <footer className="policy-footer"><PolicyLinks /></footer>
  </main>;
}
