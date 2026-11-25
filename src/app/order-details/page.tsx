import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutPageShell } from "@/components/checkout-page-shell";
import { OrderDetailsFromUrl } from "@/components/order-details";

export const metadata: Metadata = { title: "Your order — Kalacar" };

/** One order's details. The thank-you page moves here, so refreshing it can't count the purchase again.
 *  The page is static; the browser reads ?order= (cacheComponents doesn't allow reading it while building). */
export default function OrderDetailsPage() {
  return <CheckoutPageShell><div className="bag-page"><Suspense fallback={<div className="bag-empty" role="status"><p>Loading your order…</p></div>}><OrderDetailsFromUrl /></Suspense></div></CheckoutPageShell>;
}
