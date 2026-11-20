import type { Metadata } from "next";
import BagFlow from "@/components/bag-flow";
import { CheckoutPageShell } from "@/components/checkout-page-shell";

export const metadata: Metadata = { title: "Checkout — Kalacar" };

/** Step 2 of buying: delivery details and payment. Its own URL, so ad platforms can count checkouts. */
export default function CheckoutPage() {
  return <CheckoutPageShell><BagFlow step="checkout" /></CheckoutPageShell>;
}
