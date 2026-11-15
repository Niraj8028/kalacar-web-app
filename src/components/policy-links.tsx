"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { whatsappLink } from "@/data/support";
import { useSiteContent } from "@/components/site-content-provider";

export const WHATSAPP_URL = whatsappLink();
const FALLBACK = [
  { slug: "about", title: "About Kalacar" }, { slug: "contact", title: "Contact us" }, { slug: "faq", title: "FAQs" },
  { slug: "shipping", title: "Shipping" }, { slug: "returns", title: "Returns and refunds" }, { slug: "safe-transit", title: "Safe Transit Guarantee" },
  { slug: "privacy", title: "Privacy" }, { slug: "terms", title: "Terms" },
].map(page => ({ label: page.title, link: `/${page.slug}` }));

/**
 * Links in the footer and the phone menu. The owner's list from Settings → Footer and menus when one is saved;
 * otherwise pages with "Show in the footer" on. The fixed list keeps links working if neither can load.
 */
export function PolicyLinks({ className = "policy-links" }: { className?: string }) {
  const { footer, ready } = useSiteContent();
  const chosen = footer?.links ?? null;
  const [pages, setPages] = useState(FALLBACK);
  useEffect(() => {
    if (!ready || chosen) return;
    let active = true;
    fetch("/api/pages", { cache: "no-store" }).then(response => response.ok ? response.json() as Promise<{ pages: { slug: string; title: string }[] }> : null).then(data => { if (active && data) setPages(data.pages.map(page => ({ label: page.title, link: `/${page.slug}` }))); }).catch(() => undefined);
    return () => { active = false; };
  }, [ready, chosen]);
  const links = chosen ?? pages;
  return <nav className={className} aria-label="Information and policies">{links.map((item, index) => item.link.startsWith("https://")
    ? <a key={`${item.link}-${index}`} href={item.link} target="_blank" rel="noopener noreferrer">{item.label}</a>
    : <Link key={`${item.link}-${index}`} href={item.link}>{item.label}</Link>)}</nav>;
}
