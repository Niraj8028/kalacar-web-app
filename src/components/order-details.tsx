"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { money } from "@/components/bag-lines";
import { CheckMark, External } from "@/components/icons";
import { useSiteContent } from "@/components/site-content-provider";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/data/support";

export type DetailOrder = { id: string; status: string; createdAt: string; amount: number; phone?: string; address: string; pincode: string; paymentId?: string | null; giftWrap?: boolean; giftWrapPrice?: number; couponCode?: string; discount?: number; items: { name: string; variant?: string; price: number; quantity: number }[] };

const STATUS_LABELS: Record<string, string> = { paid: "Paid", payment_pending: "Awaiting payment", payment_failed: "Payment failed", payment_setup_failed: "Payment failed", cancelled: "Cancelled", paid_after_cancel: "On hold", refunded: "Refunded" };
export const orderStatusLabel = (status: string) => STATUS_LABELS[status] ?? status.replaceAll("_", " ");
const when = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(value));
const itemLine = (item: DetailOrder["items"][number]) => `${item.name}${item.variant && item.variant !== "Standard" ? ` (${item.variant})` : ""} x ${item.quantity}`;

/** What the customer sends Kalacar on WhatsApp: enough to find the order and see that it was paid. */
export function orderProofMessage(order: DetailOrder) {
  const paid = order.status === "paid";
  return [
    `Hi Kalacar, I placed order ${order.id.slice(0, 8).toUpperCase()} on ${when(order.createdAt)}.`,
    `Items: ${order.items.map(itemLine).join(", ")}`,
    `${paid ? "Total paid" : "Order total"}: ${money(order.amount)} · Status: ${orderStatusLabel(order.status)}`,
    ...(paid && order.paymentId ? [`Payment ID: ${order.paymentId}`] : []),
    ...(order.phone ? [`Phone: ${order.phone}`] : []),
  ].join("\n");
}

/** One order, for the customer: the page they land on after paying, and can come back to. */
export function OrderDetails({ orderId }: { orderId: string }) {
  const { testPayments, productPage } = useSiteContent();
  const [order, setOrder] = useState<DetailOrder | null>(null);
  const [state, setState] = useState<"loading" | "found" | "missing">(orderId ? "loading" : "missing");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    let active = true;
    if (!orderId) return;
    fetch("/api/account/orders", { cache: "no-store" }).then(r => r.ok ? r.json() : {}).then((data: { orders?: DetailOrder[] }) => {
      if (!active) return;
      const found = data.orders?.find(item => item.id === orderId) ?? null;
      setOrder(found); setState(found ? "found" : "missing");
    }).catch(() => { if (active) setState("missing"); });
    return () => { active = false; };
  }, [orderId]);
  useEffect(() => { if (state !== "loading") heading.current?.focus(); }, [state]);
  if (state === "loading") return <div className="bag-empty" role="status"><p>Loading your order…</p></div>;
  if (!order) return <section className="order-confirmed">
    <div className="order-confirmed-head">
      <h1 ref={heading} tabIndex={-1}>We couldn&apos;t find this order</h1>
      <p>Your orders are on your account page. If you ordered on another device, sign in there with the email you used.</p>
    </div>
    <div className="order-confirmed-actions">
      <Link className="checkout-demo-button" href="/account">View your orders</Link>
      <a className="bag-text-link" href={whatsappLink("Hi Kalacar, I need help finding my order.")} target="_blank" rel="noreferrer">Ask us on WhatsApp</a>
    </div>
  </section>;
  const paid = order.status === "paid";
  const number = order.id.slice(0, 8).toUpperCase();
  return <section className="order-confirmed order-details">
    <div className="order-confirmed-head">
      {paid && <span className="order-confirmed-mark" aria-hidden="true"><CheckMark size={24} /></span>}
      <h1 ref={heading} tabIndex={-1}>Order {number}</h1>
      <p><span className={`order-status ${paid ? "paid" : ["refunded", "cancelled"].includes(order.status) ? "closed" : "pending"}`}>{orderStatusLabel(order.status)}</span> · Placed on {when(order.createdAt)}</p>
      {paid && <p>Thank you! Your order is confirmed and we&apos;re preparing it.</p>}
      {testPayments && <p className="order-confirmed-test">This was a test payment. No real money was taken.</p>}
    </div>
    <div className="order-details-whatsapp">
      <p>Send these order details to Kalacar on WhatsApp{paid ? " as your proof of payment" : ""}. The message is typed in for you.</p>
      <a className="order-details-whatsapp-button" href={whatsappLink(orderProofMessage(order))} target="_blank" rel="noreferrer">Send order details on WhatsApp <External /></a>
      <small>To {SUPPORT_WHATSAPP.display}</small>
    </div>
    <div className="order-confirmed-grid">
      <div className="order-confirmed-card">
        <h2>What you ordered</h2>
        <ul className="order-lines">
          {order.items.map((item, index) => <li key={`${item.name}-${index}`}><span>{item.name}{item.variant && item.variant !== "Standard" ? ` (${item.variant})` : ""} × {item.quantity}</span><span>{money(item.price * item.quantity)}</span></li>)}
          {order.giftWrap && <li><span>Gift packaging</span><span>{money(order.giftWrapPrice ?? 0)}</span></li>}
          {order.couponCode && Boolean(order.discount) && <li><span>Coupon {order.couponCode}</span><span>−{money(order.discount ?? 0)}</span></li>}
        </ul>
        <p className="order-confirmed-total"><span>{paid ? "Total paid" : "Order total"}</span><strong>{money(order.amount)}</strong></p>
        {paid && order.paymentId && <p className="order-details-payment">Payment ID <b>{order.paymentId}</b></p>}
      </div>
      <div className="order-confirmed-card">
        <h2>Delivering to</h2>
        <p className="order-confirmed-address">{order.address}<br />PIN {order.pincode}</p>
        {paid && <p className="order-confirmed-address">Delivered in {productPage.delivery.estimate}.</p>}
      </div>
    </div>
    <div className="order-confirmed-actions">
      <Link className="checkout-demo-button" href="/account">View all your orders</Link>
      <Link className="bag-text-link" href="/#catalogue">Continue shopping</Link>
    </div>
  </section>;
}

/** The order named in ?order=. */
export function OrderDetailsFromUrl() {
  const order = useSearchParams().get("order") ?? "";
  return <OrderDetails orderId={/^[0-9a-f-]{36}$/i.test(order) ? order : ""} />;
}
