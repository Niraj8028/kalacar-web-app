import { Confirm, PolicyPage, policyMetadata } from "@/components/policy-page";

export const metadata = policyMetadata("Privacy", "What Kalacar collects, why, and who it is shared with.");

export default function PrivacyPage() {
  return <PolicyPage title="Privacy" intro="What we collect when you use Kalacar, why we need it, and who else sees it.">
    <section><h2>What we collect</h2><ul>
      <li><strong>Account:</strong> your name, email and mobile number. If you use a password, we store only a scrambled version of it. If you use Google, we receive your name, verified email and Google account ID.</li>
      <li><strong>Addresses:</strong> the delivery addresses you save or use.</li>
      <li><strong>Orders:</strong> what you bought, the amounts, any coupon, delivery details, and payment reference numbers.</li>
    </ul></section>
    <section><h2>Why we use it</h2><p>To take payment, make and deliver your order, show your order history, help you when you contact us, and protect the shop from misuse.</p></section>
    <section><h2>Who else receives it</h2><ul>
      <li><strong>Razorpay</strong> handles payment. You enter card or UPI details with Razorpay, and we don&apos;t see or store them.</li>
      <li><strong>Google</strong> receives your sign-in request if you choose Google, and your map position if you use the location option.</li>
      <li><strong>A PIN code lookup service (postalpincode.in)</strong> receives the PIN code you enter, to fill in your city and state.</li>
      <li><strong>Delivery partners</strong> receive your name, phone number and address when a parcel is sent through them.</li>
    </ul><p>We don&apos;t sell your information.</p></section>
    <section><h2>Your location</h2><p>Location is used only if you choose &ldquo;Use my current location&rdquo;, and only to help fill in your address. We don&apos;t save the map coordinates.</p></section>
    <section><h2>Cookies and browser storage</h2><p>We use cookies to keep you signed in and to complete Google sign-in safely. Your browser also stores your bag, an unfinished address and your light or dark theme. We don&apos;t use advertising cookies.</p></section>
    <section><h2>How long we keep it</h2><p><Confirm>how long account and order records are kept.</Confirm></p></section>
    <section><h2>Your choices</h2><p>You can add, change or delete saved addresses in <a href="/account">Account &amp; orders</a>. To ask for a copy of your information, or for your account to be deleted, message us. <Confirm>the person responsible for privacy requests and their contact details.</Confirm></p></section>
  </PolicyPage>;
}
