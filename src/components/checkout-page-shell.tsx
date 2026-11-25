import type { ReactNode } from "react";
import Link from "next/link";
import { ShopLogo } from "@/components/shop-logo";
import { MobileMenu } from "@/components/mobile-menu";
import { SiteFooter } from "@/components/site-footer";
import { ArrowLeft, UserCircle } from "@/components/icons";

/** Header and footer shared by the bag, checkout, order-confirmed and order-details pages. */
export function CheckoutPageShell({ children }: { children: ReactNode }) {
  return <main className="cart-page">
    <header className="detail-header">
      <MobileMenu /><ShopLogo />
      <div className="detail-header-links"><Link className="account-link" href="/account" aria-label="Your account" title="Your account"><UserCircle size={20} /><span>Account</span></Link><Link className="back-to-shop" href="/#catalogue"><ArrowLeft /> Continue shopping</Link></div>
    </header>
    <section className="cart-page-flow">{children}</section>
    <SiteFooter />
  </main>;
}
