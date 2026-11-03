"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type User = { id: string; name: string; email: string; phone: string };
type Order = { id: string; createdAt: string; amount: number; status: string; fulfillmentStatus: string; address: string; pincode: string; items: Array<{ id: string; name: string; price: number; quantity: number }> };
type CheckoutOrder = { orderId: string; razorpayOrderId: string; amount: number; currency: string; keyId: string; customer: { name: string; email: string; phone: string } };
type PaymentResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
declare global { interface Window { Razorpay?: new (options: { key: string; amount: number; currency: string; name: string; order_id: string; prefill: { name: string; email: string; contact: string }; handler: (response: PaymentResponse) => void; modal: { backdropclose: boolean; escape: boolean; handleback: boolean; confirm_close: boolean; ondismiss: () => void } }) => { open: () => void; on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void } } }
const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const waLink = (orderId?: string) => `https://wa.me/918830646308?text=${encodeURIComponent(orderId ? `Hi Kalacar, I need help with order ${orderId}. Please check its payment or delivery status.` : "Hi Kalacar, I have a question about an order.")}`;

export default function AccountPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    const session = await response.json().catch(() => null) as { user?: User | null; error?: string } | null;
    if (!response.ok || !session) {
      setUser(null); setOrders([]);
      setError(session?.error || "Account service is unavailable. Check the local database connection and try again.");
      return;
    }
    setError("");
    setUser(session.user ?? null);
    if (session.user) {
      const ordersResponse = await fetch("/api/account/orders", { cache: "no-store" });
      if (ordersResponse.ok) {
        const savedOrders = (await ordersResponse.json() as { orders: Order[] }).orders;
        setOrders(savedOrders);
        const pending = savedOrders.filter(order => ["payment_pending", "payment_failed"].includes(order.status)).slice(0, 3);
        if (pending.length) {
          const statuses = await Promise.all(pending.map(async order => {
            try {
              const response = await fetch(`/api/account/orders/${order.id}/sync`, { method: "POST", cache: "no-store" });
              const data = await response.json() as { status?: string };
              return response.ok && data.status ? [order.id, data.status] as const : null;
            } catch { return null; }
          }));
          setOrders(current => current.map(order => {
            const update = statuses.find(result => result?.[0] === order.id);
            return update ? { ...order, status: update[1] } : order;
          }));
        }
      }
    } else setOrders([]);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json().catch(() => null) as { user?: User; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not sign in.");
      const next = new URLSearchParams(window.location.search).get("next");
      if (next?.startsWith("/") && !next.startsWith("//")) { window.location.assign(next); return; }
      setUser(data?.user || null); setForm({ name: "", email: "", phone: "", password: "" }); setNotice("You’re signed in. Your orders are saved to this account.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not sign in."); }
    finally { setBusy(false); }
  }

  async function sync(order: Order) {
    setSyncing(order.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/account/orders/${order.id}/sync`, { method: "POST" });
      const data = await response.json() as { status?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not check payment status.");
      setNotice(data.status === "paid" ? `Payment confirmed for order ${order.id.slice(0, 8)}.` : `Latest status: ${data.status?.replaceAll("_", " ")}. Your order remains saved.`);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not check payment status."); }
    finally { setSyncing(""); }
  }

  async function retry(order: Order) {
    setSyncing(order.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/account/orders/${order.id}/retry`, { cache: "no-store" });
      const checkout = await response.json() as CheckoutOrder & { error?: string };
      if (!response.ok) throw new Error(checkout.error || "Could not reopen payment.");
      if (!window.Razorpay) {
        const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js";
        await new Promise<void>((resolve, reject) => { script.onload = () => resolve(); script.onerror = () => reject(new Error("Razorpay Checkout could not load.")); document.body.appendChild(script); });
      }
      if (!window.Razorpay) throw new Error("Razorpay Checkout could not load.");
      const instance = new window.Razorpay({ key: checkout.keyId, amount: checkout.amount, currency: checkout.currency, name: "Kalacar", order_id: checkout.razorpayOrderId, prefill: { name: checkout.customer.name, email: checkout.customer.email, contact: checkout.customer.phone }, handler: async payment => {
        try {
          const verify = await fetch("/api/checkout/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: checkout.orderId, ...payment }) });
          const result = await verify.json() as { status?: string; error?: string };
          if (!verify.ok || result.status !== "paid") setError(result.error || "Payment received. We are still confirming it—check status again shortly.");
          else setNotice(`Payment confirmed for order ${order.id.slice(0, 8)}.`);
        } catch { setError("We could not confirm payment just now. Your order remains saved; use Check payment status before retrying."); }
        await refresh();
      }, modal: { backdropclose: false, escape: false, handleback: false, confirm_close: true, ondismiss: () => { setNotice("Checkout closed. We’re checking the saved order; avoid creating another order while it is pending."); void sync(order); } } });
      instance.on("payment.failed", response => setError(response.error?.description || "Payment did not complete. Your order remains saved and can be retried."));
      instance.open();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not reopen payment."); }
    finally { setSyncing(""); }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }); setUser(null); setOrders([]); setNotice("You have signed out.");
  }

  return <main className="account-page">
    <header className="detail-header"><Link className="wordmark" href="/">kalacar<span>.</span><small>SMALL DEVOTIONAL MURTIS</small></Link><Link className="back-to-shop" href="/#catalogue">← Continue shopping</Link></header>
    <section className="account-content">
      <p className="eyebrow">KALACAR CUSTOMER ACCOUNT</p>
      <h1>{user ? `Namaste, ${user.name.split(" ")[0]}` : "Your orders, in one place."}</h1>
      <p className="account-lede">Payment status and order records stay attached to your account, even if you close the payment window.</p>
      <p className="account-demo-banner">LOCAL DEVELOPMENT · Test accounts and Razorpay test mode only. No live payment is taken.</p>
      {error && <p className="account-message error" role="alert">{error}</p>}{notice && <p className="account-message" role="status">{notice}</p>}
      {!user ? <div className="account-card">
        <div className="account-tabs"><button className={mode === "login" ? "selected" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button><button className={mode === "register" ? "selected" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button></div>
        <form className="account-form" onSubmit={submit}>
          {mode === "register" && <><label>Your name<input required minLength={2} maxLength={160} autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Mobile number<input required type="tel" minLength={10} autoComplete="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label></>}
          <label>Email<input required type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
          <label>Password<input required type="password" minLength={10} autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
          <button className="checkout-demo-button" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
        <details className="demo-accounts"><summary>Local demo accounts</summary><p>Use any of these with the shared local demo password shown below. These accounts exist only in this development database.</p><ul><li>ganpati@example.test</li><li>krishna@example.test</li><li>swami@example.test</li></ul><code>KalacarLocal2026!</code></details>
      </div> : <div className="account-card">
        <div className="account-profile"><div><strong>{user.name}</strong><span>{user.email} · {user.phone}</span></div><button type="button" className="account-signout" onClick={() => void logout()}>Sign out</button></div>
        <h2>Your orders</h2>
        {orders.length === 0 ? <p className="empty-orders">No orders yet. Your checkout orders will appear here.</p> : <div className="account-orders">{orders.map(order => {
          const status = order.status.replaceAll("_", " ");
          return <article className="account-order" key={order.id}>
            <div className="order-heading"><div><span>Order {order.id.slice(0, 8).toUpperCase()}</span><small>{new Date(order.createdAt).toLocaleString("en-IN")}</small></div><strong>{money(order.amount)}</strong></div>
            <p>{order.items.map(item => `${item.name} × ${item.quantity}`).join(" · ")}</p>
            {order.status === "paid" && <p className="customer-fulfillment-status">Delivery progress: {({ unfulfilled: "Preparing for packing", processing: "Being prepared", dispatched: "Dispatched", completed: "Delivered" } as Record<string, string>)[order.fulfillmentStatus] || "Being prepared"}</p>}
            <details className="order-delivery"><summary>Delivery address</summary><p>{order.address} · PIN {order.pincode}</p></details>
            <div className="order-status-row"><span className={`order-status ${order.status === "paid" ? "paid" : "pending"}`}>{status}</span><div>{order.status !== "paid" && <><button type="button" className="sync-order-button" disabled={syncing === order.id} onClick={() => void sync(order)}>{syncing === order.id ? "Checking…" : "Check payment status"}</button><button type="button" className="sync-order-button" disabled={syncing === order.id} onClick={() => void retry(order)}>Retry payment</button></>}<a className="order-whatsapp" href={waLink(order.id)} target="_blank" rel="noreferrer">WhatsApp help ↗</a></div></div>
          </article>;
        })}</div>}
      </div>}
      <a className="account-contact" href={waLink()} target="_blank" rel="noreferrer">Questions about an order? WhatsApp Kalacar · +91 88306 46308</a>
    </section>
  </main>;
}
