import { Confirm, PolicyPage, policyMetadata } from "@/components/policy-page";
import { DELIVERY_ESTIMATE } from "@/lib/store-info";

export const metadata = policyMetadata("Shipping", "How Kalacar makes, packs and ships your murti.");

export default function ShippingPage() {
  return <PolicyPage title="Shipping" intro="Kalacar is a small shop. We make each order, pack it and ship it ourselves.">
    <section><h2>How long delivery takes</h2><p>Orders are usually delivered in {DELIVERY_ESTIMATE}. This is an estimate, not a guaranteed date, because each murti is made to order.</p></section>
    <section><h2>Where we deliver</h2><p><Confirm>the areas of India you deliver to, and any you don&apos;t.</Confirm></p><p>Entering a PIN code at checkout fills in your city and state. It doesn&apos;t confirm that we deliver there.</p></section>
    <section><h2>Delivery charges</h2><p><Confirm>the delivery fee and any free-delivery amount.</Confirm></p></section>
    <section><h2>Payment</h2><p>All orders are paid online when you order, through Razorpay. We don&apos;t offer Cash on Delivery.</p></section>
    <section><h2>Tracking your order</h2><p>Your order&apos;s progress appears in <a href="/account">Account &amp; orders</a>: preparing for packing, dispatched, then delivered. When we have courier or tracking details, we add them there as a note.</p></section>
    <section><h2>If your parcel arrives damaged</h2><p>See the <a href="/safe-transit">Safe Transit Guarantee</a>.</p></section>
  </PolicyPage>;
}
