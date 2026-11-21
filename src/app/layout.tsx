import type { Metadata } from "next";
import { Jost, Marcellus } from "next/font/google";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/cart-provider";
import { FestiveOverlay } from "@/components/festive-overlay";
import { SiteContentProvider } from "@/components/site-content-provider";
import { TrackingTags } from "@/components/tracking-tags";
import CartDrawer from "@/components/cart-drawer";
import StoreGate from "@/components/store-gate";
import { cachedSeo } from "@/lib/seo-cache";
import { siteOrigin } from "@/lib/seo";
import "./globals.css";

// Headings: Marcellus (classical, inscription-style serif; one weight). Everything else: Jost. Served from this site.
const display = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-marcellus", display: "swap" });
const body = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap" });

/** Title, description and favicon come from dashboard Settings → Shop → Website title and icon. */
export async function generateMetadata(): Promise<Metadata> {
  const seo = await cachedSeo();
  const hidden = process.env.KALACAR_ALLOW_SEARCH === "false" || !seo.showOnGoogle;
  return {
    metadataBase: new URL(siteOrigin()),
    title: seo.title, description: seo.description, icons: seo.favicon ? { icon: seo.favicon, apple: seo.favicon } : { icon: "/favicon.ico" },
    openGraph: { type: "website", siteName: "Kalacar", title: seo.title, description: seo.description, locale: "en_IN" },
    // While the shop is hidden from Google, pages also say so, in case Google reached them through a link.
    robots: hidden ? { index: false, follow: false } : undefined,
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable}`}>
      <body><CartProvider><SiteContentProvider><TrackingTags /><FestiveOverlay /><StoreGate>{children}</StoreGate><CartDrawer /></SiteContentProvider></CartProvider></body>
    </html>
  );
}
