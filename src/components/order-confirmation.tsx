"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { money } from "@/components/bag-lines";
import { CheckMark } from "@/components/icons";
import { useSiteContent } from "@/components/site-content-provider";
import { updatesGoTo } from "@/lib/store-info";
import { trackShopEvent } from "@/components/tracking-tags";
import { rememberSeenOrder } from "@/lib/seen-orders";

type ConfirmedOrder = { id: string; status?: string; createdAt: string; amount: number; email?: string; phone?: string; address: string; pincode: string; giftWrap?: boolean; giftWrapPrice?: number; couponCode?: string; discount?: number; items: { id?: string; name: string; variant?: string; price: number; quantity: number }[] };

const TRACKED_KEY = "kalacar.tracked-purchases.v1";

// How long the thank-you shows before moving to the order's own page.
export const THANK_YOU_MS = 6000;

/** Reports each paid order to Meta and Google once, even if this screen is shown again. False if it was already reported. */
function trackPurchaseOnce(order: ConfirmedOrder) {
  let done: string[] = [];
  try { done = JSON.parse(localStorage.getItem(TRACKED_KEY) ?? "[]") as string[]; } catch { /* treat as none */ }
  if (done.includes(order.id)) return false;
  trackShopEvent("purchase", order.items.map(item => ({ id: item.id ?? item.name, name: item.name, variant: item.variant, price: item.price, quantity: item.quantity })), { orderId: order.id, value: order.amount });
  try { localStorage.setItem(TRACKED_KEY, JSON.stringify([...done, order.id].slice(-50))); } catch { /* storage blocked */ }
  return true;
}

/** Shown after payment. Details come from the saved order, so they always match what was paid for. */
export function OrderConfirmation({ orderId, email }: { orderId: string; email?: string }) {
  const { testPayments, productPage } = useSiteContent();
  const router = useRouter();
  const [order, setOrder] = useState<ConfirmedOrder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const missing = !orderId || notFound;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    let active = true, timer = 0;
    if (!orderId) return;
    fetch("/api/account/orders", { cache: "no-store" }).then(r => r.ok ? r.json() : {}).then((data: { orders?: ConfirmedOrder[] }) => {
      const found = data.orders?.find(item => item.id === orderId && (!item.status || item.status === "paid")) ?? null;
      if (!active) return;
      setOrder(found);
      setNotFound(!found);
      if (!found) return;
      const firstTime = trackPurchaseOnce(found);
      rememberSeenOrder(found.id);
      // The thank-you shows once; after that, and on any refresh, the order's own page takes its place.
      const details = `/order-details?order=${encodeURIComponent(found.id)}`;
      if (firstTime) timer = window.setTimeout(() => router.replace(details), THANK_YOU_MS); else router.replace(details);
    }).catch(() => undefined);
    return () => { active = false; window.clearTimeout(timer); };
  }, [orderId, router]);
  // Opened without a paid order this browser can see (an old link, another device): no thank-you, just a way to the orders.
  if (missing) return <section className="order-confirmed">
    <div className="order-confirmed-head">
      <h1 ref={heading} tabIndex={-1}>We couldn&apos;t find this order</h1>
      <p>Your orders are on your account page. If you paid on another device, sign in there with the email you used.</p>
    </div>
    <div className="order-confirmed-actions">
      <Link className="checkout-demo-button" href="/account">View your orders</Link>
      <Link className="bag-text-link" href="/#catalogue">Continue shopping</Link>
    </div>
  </section>;
  return <section className="order-confirmed">
    <div className="order-confirmed-head">
      <span className="order-confirmed-mark" aria-hidden="true"><CheckMark size={24} /></span>
      <h1 ref={heading} tabIndex={-1}>Thank you, your order is confirmed</h1>
      <p>Order <strong>{orderId.slice(0, 8).toUpperCase()}</strong> is paid.</p>
      {(order?.email || email) && <p className="order-confirmed-contact">{updatesGoTo(order?.email || email || "", order?.phone ?? "")}</p>}
      {testPayments && <p className="order-confirmed-test">This was a test payment. No real money was taken.</p>}
    </div>
    <div className="order-confirmed-grid">
      <div className="order-confirmed-card">
        <h2>What you ordered</h2>
        {order ? <>
          <ul className="order-lines">
            {order.items.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name}{item.variant && item.variant !== "Standard" ? ` (${item.variant})` : ""} × {item.quantity}</span><span>{money(item.price * item.quantity)}</span></li>)}
            {order.giftWrap && <li><span>Gift packaging</span><span>{money(order.giftWrapPrice ?? 0)}</span></li>}
            {order.couponCode && Boolean(order.discount) && <li><span>Coupon {order.couponCode}</span><span>−{money(order.discount ?? 0)}</span></li>}
          </ul>
          <p className="order-confirmed-total"><span>Total paid</span><strong>{money(order.amount)}</strong></p>
          <h2>Delivering to</h2>
          <p className="order-confirmed-address">{order.address}<br />PIN {order.pincode}</p>
        </> : <p className="order-confirmed-address">You can see the full details in your orders.</p>}
      </div>
      <div className="order-confirmed-card">
        <h2>What happens next</h2>
        <ol className="order-next">
          <li><b>We choose your murti</b><span>We pick out your murti and check it carefully.</span></li>
          <li><b>We pack and dispatch it</b><span>It is packed safely and handed to the courier. Tracking details appear on your order once it ships.</span></li>
          <li><b>We ship it to you</b><span>It is delivered to your address in {productPage.delivery.estimate}.</span></li>
        </ol>
      </div>
    </div>
    <div className="order-confirmed-actions">
      <Link className="checkout-demo-button" href={`/order-details?order=${encodeURIComponent(orderId)}`}>View order details</Link>
      <Link className="bag-text-link" href="/#catalogue">Continue shopping</Link>
    </div>
  </section>;
}

/** The thank-you page's confirmation, for the order named in ?order=. */
export function OrderConfirmationFromUrl() {
  const order = useSearchParams().get("order") ?? "";
  return <OrderConfirmation orderId={/^[0-9a-f-]{36}$/i.test(order) ? order : ""} />;
}
