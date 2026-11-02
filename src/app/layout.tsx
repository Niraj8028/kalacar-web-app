import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/cart-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kalacar — Small Devotional Murtis",
  description: "Shop small murtis for car dashboards, Devghars, and personal mandirs.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-scroll-behavior="smooth">
      <body><CartProvider>{children}</CartProvider></body>
    </html>
  );
}
