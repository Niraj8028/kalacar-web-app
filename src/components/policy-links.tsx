"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { whatsappLink } from "@/data/support";

export const WHATSAPP_URL = whatsappLink();
const FALLBACK = [
  { slug: "about", title: "About Kalacar" }, { slug: "contact", title: "Contact us" }, { slug: "faq", title: "FAQs" },
  { slug: "shipping", title: "Shipping" }, { slug: "returns", title: "Returns and refunds" }, { slug: "safe-transit", title: "Safe Transit Guarantee" },
  { slug: "privacy", title: "Privacy" }, { slug: "terms", title: "Terms" },
];

/** Footer links from the dashboard's Pages section. The fixed list keeps links working if that can't load. */
export function PolicyLinks({ className = "policy-links" }: { className?: string }) {
  const [links, setLinks] = useState(FALLBACK);
  useEffect(() => {
    let active = true;
    fetch("/api/pages", { cache: "no-store" }).then(response => response.ok ? response.json() as Promise<{ pages: typeof FALLBACK }> : null).then(data => { if (active && data) setLinks(data.pages); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return <nav className={className} aria-label="Information and policies">{links.map(link => <Link key={link.slug} href={`/${link.slug}`}>{link.title}</Link>)}</nav>;
}
