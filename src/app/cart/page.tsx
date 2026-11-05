import Link from "next/link";
import BagFlow from "@/components/bag-flow";
import { ArrowLeft, UserCircle } from "@/components/icons";

/** The full bag page, opened from the top bar's bag button, Account, or Proceed to checkout in the drawer. */
export default function CartPage() {
  return <main className="cart-page">
    <header className="detail-header">
      <Link className="wordmark" href="/">kalacar<span>.</span><small>SMALL DEVOTIONAL MURTIS</small></Link>
      <div className="detail-header-links"><Link className="account-link" href="/account" aria-label="Your account"><UserCircle size={20} /><span>Account</span></Link><Link className="back-to-shop" href="/#catalogue"><ArrowLeft /> Continue shopping</Link></div>
    </header>
    <section className="cart-page-flow"><BagFlow /></section>
  </main>;
}
