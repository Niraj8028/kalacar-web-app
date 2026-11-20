import type { Metadata } from "next";
import BagFlow from "@/components/bag-flow";
import { CheckoutPageShell } from "@/components/checkout-page-shell";

export const metadata: Metadata = { title: "Your bag — Kalacar" };

/** Step 1 of buying: the bag. Opened from the top bar's bag button and Account. */
export default function CartPage() {
  return <CheckoutPageShell><BagFlow step="cart" /></CheckoutPageShell>;
}
