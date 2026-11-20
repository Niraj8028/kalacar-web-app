import type { Metadata } from "next";
import { CheckoutPageShell } from "@/components/checkout-page-shell";
import { OrderConfirmation } from "@/components/order-confirmation";

export const metadata: Metadata = { title: "Order confirmed — Kalacar" };

/** Step 3 of buying: the thank-you page after payment. Its own URL, so ad platforms can count purchases. */
export default async function OrderConfirmedPage({ searchParams }: { searchParams: Promise<{ order?: string | string[] }> }) {
  const { order } = await searchParams;
  const orderId = typeof order === "string" && /^[0-9a-f-]{36}$/i.test(order) ? order : "";
  return <CheckoutPageShell><div className="bag-page"><OrderConfirmation orderId={orderId} /></div></CheckoutPageShell>;
}
