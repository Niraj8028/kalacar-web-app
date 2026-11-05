import { Confirm, PolicyPage, policyMetadata } from "@/components/policy-page";

export const metadata = policyMetadata("Returns and refunds", "Kalacar's rules for damaged parcels, returns, cancellations and refunds.");

export default function ReturnsPage() {
  return <PolicyPage title="Returns and refunds" intro="What happens if something goes wrong with your order, or you change your mind.">
    <section><h2>Damaged in transit</h2><p>The <a href="/safe-transit">Safe Transit Guarantee</a> explains what to do.</p></section>
    <section><h2>Returns if you change your mind</h2><p>Each murti is made to order. <Confirm>whether change-of-mind returns are accepted, the time limit, and who pays for return shipping.</Confirm></p></section>
    <section><h2>Cancelling an order</h2><p><strong>Not yet paid:</strong> no money has been taken. Message us and we can cancel the order and release the items.</p><p><strong>Already paid:</strong> message us as soon as you can. <Confirm>until which stage a paid order can be cancelled.</Confirm></p></section>
    <section><h2>Refunds</h2><ul><li>Refunds go back through Razorpay to the way you paid.</li><li>The refunded amount appears on your order in <a href="/account">Account &amp; orders</a>.</li><li><Confirm>how many days a refund takes, and whether gift packaging is refunded.</Confirm></li></ul></section>
    <section><h2>Coupons</h2><p>A coupon used on a cancelled unpaid order can be used again. A coupon used on an order that was later refunded can&apos;t.</p></section>
  </PolicyPage>;
}
