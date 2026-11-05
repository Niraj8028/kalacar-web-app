"use client";

import Link from "next/link";
import { useEffect } from "react";
import BagFlow from "@/components/bag-flow";
import { useCart } from "@/components/cart-provider";
import { ArrowLeft, UserCircle } from "@/components/icons";

/** /cart keeps working for old links and refreshes, showing the same bag and checkout as the drawer. */
export default function CartPage() {
  const { closeDrawer } = useCart();
  useEffect(() => () => closeDrawer(true), [closeDrawer]);
  return <main className="cart-page">
    <header className="detail-header">
      <Link className="wordmark" href="/">kalacar<span>.</span><small>SMALL DEVOTIONAL MURTIS</small></Link>
      <div className="detail-header-links"><Link className="account-link" href="/account" aria-label="Your account"><UserCircle size={20} /><span>Account</span></Link><Link className="back-to-shop" href="/#catalogue"><ArrowLeft /> Continue shopping</Link></div>
    </header>
    <section className="cart-page-flow"><BagFlow mode="page" /></section>
  </main>;
}
