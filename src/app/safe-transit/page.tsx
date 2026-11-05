import { Confirm, PolicyPage, WHATSAPP_URL, policyMetadata } from "@/components/policy-page";

export const metadata = policyMetadata("Safe Transit Guarantee", "What to do if your Kalacar murti arrives damaged.");

export default function SafeTransitPage() {
  return <PolicyPage title="Safe Transit Guarantee" intro="Murtis are delicate. If yours is damaged on the way to you, here is how we put it right.">
    <section><h2>Three steps</h2><ol className="policy-steps">
      <li><b>Film the unboxing.</b> Record one continuous, unedited video from the sealed parcel until the murti is fully out.</li>
      <li><b>Tell us quickly.</b> Send the video and your order number on <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp</a> within <Confirm>the reporting window in hours.</Confirm> <Confirm>a claim email address, if you want one.</Confirm></li>
      <li><b>We put it right.</b> After checking the video, we arrange <Confirm>a free replacement, a full refund, or the customer&apos;s choice of either.</Confirm></li>
    </ol></section>
    <section><details className="policy-details"><summary>Unboxing guidelines</summary><ul><li>Show the sealed parcel and its shipping label at the start.</li><li>Keep the parcel and murti in view, without cuts or pauses.</li><li>Keep the packaging until your claim is settled.</li></ul></details></section>
  </PolicyPage>;
}
