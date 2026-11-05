import { Confirm, PolicyPage, policyMetadata } from "@/components/policy-page";

export const metadata = policyMetadata("Terms", "The terms for buying from Kalacar.");

export default function TermsPage() {
  return <PolicyPage title="Terms" intro="These terms apply when you use the Kalacar website or place an order.">
    <section><h2>Who we are</h2><p>Kalacar sells small devotional murtis. <Confirm>the shop&apos;s legal name and business address.</Confirm></p></section>
    <section><h2>Your account</h2><p>You need an account to order, so your payment status and order history stay with you. Please keep your sign-in details private and your contact details correct.</p></section>
    <section><h2>Products and prices</h2><p>Prices are in Indian rupees. The total is worked out when you pay, and that is the amount charged. Stock is limited, and an item is reserved only when you start payment.</p><p><Confirm>any notes about size, colour or finish differences between photos and the finished murti.</Confirm></p></section>
    <section><h2>Coupons</h2><p>Each coupon has its own conditions, such as dates, a minimum spend and a limit on uses, which are checked again when you pay. Coupon discounts apply to murtis, not to gift packaging. If a coupon stops being valid before payment, it is removed and you see the new total first.</p></section>
    <section><h2>Payment and your order</h2><p>Orders are paid online through Razorpay, and we don&apos;t offer Cash on Delivery. An order is confirmed once your payment has been verified. We may cancel an unpaid order and release its items.</p></section>
    <section><h2>Delivery, returns and refunds</h2><p>See <a href="/shipping">Shipping</a>, <a href="/returns">Returns and refunds</a> and the <a href="/safe-transit">Safe Transit Guarantee</a>. Our <a href="/privacy">Privacy</a> page explains how we use your information.</p></section>
    <section><h2>Disputes</h2><p><Confirm>which law and courts apply.</Confirm></p></section>
  </PolicyPage>;
}
