import type { Metadata } from "next";
import Storefront from "@/components/storefront";
import { siteOrigin } from "@/lib/seo";
import { jsonForScript } from "@/lib/product-seo";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** Tells Google the shop's name and address, so searches for "Kalacar" show the site with its name. */
const SITE = { "@context": "https://schema.org", "@graph": [
  { "@type": "Organization", name: "Kalacar", url: siteOrigin(), logo: `${siteOrigin()}/favicon.ico` },
  { "@type": "WebSite", name: "Kalacar", url: siteOrigin() },
] };

export default function Home() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonForScript(SITE) }} />
    <Storefront />
  </>;
}
