import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/cart-provider";
import { FestiveOverlay } from "@/components/festive-overlay";
import { SiteContentProvider } from "@/components/site-content-provider";
import CartDrawer from "@/components/cart-drawer";
import StoreGate from "@/components/store-gate";
import "./globals.css";

// Headings: Cormorant Garamond (thin, classic serif). Everything else: Montserrat. Served from this site.
const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-cormorant", display: "swap" });
const body = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });

export const metadata: Metadata = {
  title: "Kalacar — Small Devotional Murtis",
  description: "Shop small murtis for car dashboards, Devghars, and personal mandirs.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable}`}>
      <body><CartProvider><SiteContentProvider><FestiveOverlay /><StoreGate>{children}</StoreGate><CartDrawer /></SiteContentProvider></CartProvider></body>
    </html>
  );
}
