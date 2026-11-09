"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useSiteContent } from "@/components/site-content-provider";
import { DEFAULT_BRAND, DEFAULT_LOGO } from "@/data/site-content";

/** The owner's logo from dashboard Settings (or the built-in one), with its colour and size choices. */
export function useLogo() {
  const brand = useSiteContent().brand ?? DEFAULT_BRAND;
  const own = Boolean(brand.logo) && !brand.white;
  return {
    src: brand.logo || DEFAULT_LOGO,
    className: `brand-logo${own ? " own-colours" : ""}${brand.width ? " sized" : ""}`,
    style: brand.width ? { "--logo-w": `${brand.width}px` } as CSSProperties : undefined,
  };
}

/** The Kalacar logo, linking home, for pages other than the home page. */
export function ShopLogo() {
  const logo = useLogo();
  return <Link className="shop-logo" href="/" aria-label="Kalacar home">
    <Image src={logo.src} alt="Kalacar" width={220} height={94} className={logo.className} style={logo.style} priority />
  </Link>;
}
