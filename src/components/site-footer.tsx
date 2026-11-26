"use client";

import Image from "next/image";
import Link from "next/link";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/data/support";
import { BusinessDetailsBlock } from "@/components/business-details";
import { PolicyLinks } from "@/components/policy-links";
import { useLogo } from "@/components/shop-logo";
import { useSiteContent } from "@/components/site-content-provider";
import { DEFAULT_FOOTER } from "@/data/site-content";

/** The shop footer on every page: logo left, business details and WhatsApp right, links, then the footer text (copyright) centred. Set in Settings → Footer and menus. */
export function SiteFooter() {
  const logo = useLogo();
  const footer = useSiteContent().footer ?? DEFAULT_FOOTER;
  return <footer className="shop-footer">
    <Link className="wordmark footer-wordmark" href="/" aria-label="Kalacar home">
      <Image src={logo.src} alt="Kalacar — Small Devotional Murtis" width={180} height={77} className={logo.className} style={logo.style} />
    </Link>
    <div className="footer-contact">
      <BusinessDetailsBlock business={footer.business} className="footer-business" />
      {footer.showWhatsapp && <a className="footer-whatsapp" href={whatsappLink("Hi Kalacar, I have a question about an order.")} target="_blank" rel="noreferrer">WhatsApp · {SUPPORT_WHATSAPP.display}</a>}
    </div>
    <PolicyLinks />
    {footer.text && <p className="footer-copyright">{footer.text}</p>}
  </footer>;
}
