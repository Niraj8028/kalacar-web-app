import type { Metadata } from "next";
import { Jost, Marcellus } from "next/font/google";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/cart-provider";
import { FestiveOverlay } from "@/components/festive-overlay";
import { SiteContentProvider } from "@/components/site-content-provider";
import { TrackingTags } from "@/components/tracking-tags";
import CartDrawer from "@/components/cart-drawer";
import StoreGate from "@/components/store-gate";
import "./globals.css";

// Headings: Marcellus (classical, inscription-style serif; one weight). Everything else: Jost. Served from this site.
const display = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-marcellus", display: "swap" });
const body = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap" });

export const metadata: Metadata = {
  title: "Kalacar — Small Devotional Murtis",
  description: "Shop small murtis for car dashboards, Devghars, and personal mandirs.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable}`}>
      <body><CartProvider><SiteContentProvider><TrackingTags /><FestiveOverlay /><StoreGate>{children}</StoreGate><CartDrawer /></SiteContentProvider></CartProvider></body>
    </html>
  );
}
