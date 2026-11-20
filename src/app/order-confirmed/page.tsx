import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutPageShell } from "@/components/checkout-page-shell";
import { OrderConfirmationFromUrl } from "@/components/order-confirmation";

export const metadata: Metadata = { title: "Order confirmed — Kalacar" };

/** Step 3 of buying: the thank-you page after payment. Its own URL, so ad platforms can count purchases.
 *  The page is static; the browser reads ?order= (cacheComponents doesn't allow reading it while building). */
export default function OrderConfirmedPage() {
  return <CheckoutPageShell><div className="bag-page"><Suspense fallback={<div className="bag-empty" role="status"><p>Loading your order…</p></div>}><OrderConfirmationFromUrl /></Suspense></div></CheckoutPageShell>;
}
