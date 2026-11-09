"use client";

import Image from "next/image";
import Link from "next/link";
import { useSiteContent } from "@/components/site-content-provider";
import { DEFAULT_LOGO } from "@/data/site-content";

/** The owner's logo from dashboard Settings, or the built-in one. */
export function useLogo() {
  return useSiteContent().brand?.logo || DEFAULT_LOGO;
}

/** The Kalacar logo, linking home, for pages other than the home page. */
export function ShopLogo() {
  return <Link className="shop-logo" href="/" aria-label="Kalacar home">
    <Image src={useLogo()} alt="Kalacar" width={220} height={94} className="brand-logo" priority />
  </Link>;
}
