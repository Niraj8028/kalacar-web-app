"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useCart } from "@/components/cart-provider";
import type { RazorpayPaymentSuccess } from "@/types/razorpay";

const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

type SavedCheckout = { fingerprint: string; idempotencyKey: string; orderId: string; razorpayOrderId: string; amount: number };
const SAVED_CHECKOUT_KEY = "kalacar.pending-checkout.v1";
function readSavedCheckout(): SavedCheckout | null {
  try {
    const value = localStorage.getItem(SAVED_CHECKOUT_KEY);
    if (!value) return null;
    const saved = JSON.parse(value) as Partial<SavedCheckout>;
    if (typeof saved.fingerprint !== "string" || typeof saved.idempotencyKey !== "string" || !/^[0-9a-f-]{36}$/i.test(saved.idempotencyKey)) return null;
    if (typeof saved.orderId !== "string" || typeof saved.razorpayOrderId !== "string" || typeof saved.amount !== "number") return null;
    return saved as SavedCheckout;
  } catch { return null; }
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CartPage() {
  const { lines, subtotal, setQuantity, remove, products: catalogue, clear, canAdd, add, catalogueLoading, catalogueError } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verificationData, setVerificationData] = useState<{ orderId: string; payment: RazorpayPaymentSuccess } | null>(null);
  const checkoutKey = useRef({ fingerprint: "", value: "" });
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", address: "", city: "", state: "", landmark: "", instructions: "", pincode: "" });
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [account, setAccount] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [savedCheckout, setSavedCheckout] = useState<SavedCheckout | null>(null);
  const [paymentStatus, setPaymentStatus] = useState("");
  const lastAutoSyncAt = useRef(0);
  const products = lines.flatMap((line) => {
    const item = catalogue.find((product) => product.id === line.id);
    return item ? [{ item, quantity: line.quantity }] : [];
  });
  // A success message belongs to the completed order, not to any items added afterward.
  const showSuccess = Boolean(success) && products.length === 0;

  useEffect(() => {
    if (success && products.length > 0) setSuccess("");
  }, [success, products.length]);

  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" }).then(response => response.json()).then((data: { user: { name: string; email: string; phone: string } | null }) => {
      setAccount(data.user);
      if (data.user) setCustomer(previous => ({ ...previous, name: data.user!.name, email: data.user!.email, phone: data.user!.phone }));
      const saved = readSavedCheckout();
      if (saved) { setSavedCheckout(saved); if (saved.orderId && data.user) void syncSavedCheckout(saved, true); }
    }).finally(() => setAccountLoaded(true));
  }, []);

  useEffect(() => {
    if (!savedCheckout?.orderId || !account) return;
    const onReturnToPage = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastAutoSyncAt.current < 5000) return;
      lastAutoSyncAt.current = Date.now();
      void syncSavedCheckout(savedCheckout, true);
    };
    window.addEventListener("focus", onReturnToPage);
    document.addEventListener("visibilitychange", onReturnToPage);
    return () => { window.removeEventListener("focus", onReturnToPage); document.removeEventListener("visibilitychange", onReturnToPage); };
  }, [savedCheckout?.orderId, account?.email]);

  async function syncSavedCheckout(saved = savedCheckout, quiet = false, clearCurrentCart = true) {
    if (!saved?.orderId) return;
    if (quiet) lastAutoSyncAt.current = Date.now();
    if (!quiet) { setBusy(true); setError(""); }
    try {
      const response = await fetch(`/api/account/orders/${saved.orderId}/sync`, { method: "POST", cache: "no-store" });
      const result = await response.json() as { status?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Could not check payment status.");
      setPaymentStatus(result.status || "payment_pending");
      if (result.status === "paid") {
        localStorage.removeItem(SAVED_CHECKOUT_KEY); setSavedCheckout(null); if (clearCurrentCart) clear();
        setError(""); setSuccess(`Payment confirmed. Order ${saved.orderId.slice(0, 8)} is recorded.`);
      } else if (!quiet) {
        setError(`The order is still saved as ${result.status?.replaceAll("_", " ")}. Check your account or retry this same order.`);
      } else {
        setError("Payment is not confirmed yet. Your order is saved; check its status before trying again.");
      }
    } catch (e) {
      if (!quiet) setError(e instanceof Error ? e.message : "Could not check payment status. Your saved order is still available in your account.");
    } finally { if (!quiet) setBusy(false); }
  }

  async function verifyPayment(orderId: string, payment: RazorpayPaymentSuccess) {
    setBusy(true); setError("");
    try {
      const result = await fetch("/api/checkout/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, ...payment }) });
      const verification = await result.json() as { error?: string; status?: string };
      if (!result.ok || verification.status !== "paid") throw new Error(verification.error || "Payment is still being verified.");
      const confirmation = `Payment confirmed in test mode. Order ${orderId.slice(0, 8)} is recorded.`;
      localStorage.removeItem(SAVED_CHECKOUT_KEY); setSavedCheckout(null);
      setVerificationData(null); clear(); checkoutKey.current = { fingerprint: "", value: "" };
      setSuccess(confirmation);
    } catch (verificationError) {
      setVerificationData({ orderId, payment });
      setError(verificationError instanceof Error ? verificationError.message : "Payment verification is pending. Keep this page open and retry.");
    } finally { setBusy(false); }
  }

  async function startCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      if (!await loadRazorpay() || !window.Razorpay) throw new Error("Razorpay Checkout could not load. Please check your connection and retry.");
      const fingerprint = JSON.stringify({ items: [...lines].sort((a, b) => a.id.localeCompare(b.id)), customer });
      const existing = readSavedCheckout();
      if (existing && existing.fingerprint !== fingerprint) {
        if (existing.orderId) await syncSavedCheckout(existing, true, false);
        const status = readSavedCheckout();
        if (status) throw new Error("You already have an unpaid order. Check its payment status or retry it from Account & orders before starting a different checkout.");
      }
      if (!checkoutKey.current.value || checkoutKey.current.fingerprint !== fingerprint) {
        checkoutKey.current = { fingerprint, value: existing?.fingerprint === fingerprint ? existing.idempotencyKey : crypto.randomUUID() };
      }
      const persisted: SavedCheckout = { fingerprint, idempotencyKey: checkoutKey.current.value, orderId: existing?.fingerprint === fingerprint ? existing.orderId : "", razorpayOrderId: existing?.fingerprint === fingerprint ? existing.razorpayOrderId : "", amount: existing?.fingerprint === fingerprint ? existing.amount : 0 };
      localStorage.setItem(SAVED_CHECKOUT_KEY, JSON.stringify(persisted));
      const response = await fetch("/api/checkout/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idempotencyKey: checkoutKey.current.value, items: lines, customer }) });
      const order = await response.json() as { error?: string; orderId: string; razorpayOrderId: string; amount: number; currency: string; keyId: string };
      if (!response.ok) {
        if (response.status === 502) { checkoutKey.current = { fingerprint: "", value: "" }; localStorage.removeItem(SAVED_CHECKOUT_KEY); setSavedCheckout(null); }
        throw new Error(order.error || "Could not start checkout.");
      }
      const activeOrder: SavedCheckout = { ...persisted, orderId: order.orderId, razorpayOrderId: order.razorpayOrderId, amount: order.amount };
      localStorage.setItem(SAVED_CHECKOUT_KEY, JSON.stringify(activeOrder)); setSavedCheckout(activeOrder);
      const checkout = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, name: "Kalacar",
        description: "Small devotional murti order", order_id: order.razorpayOrderId,
        prefill: { name: customer.name, email: customer.email, contact: customer.phone },
        handler: (payment) => void verifyPayment(order.orderId, payment),
        modal: {
          backdropclose: false, escape: false, handleback: false, confirm_close: true,
          ondismiss: () => { setError("Checkout closed. We’re checking the saved order status; don’t place another order while it is being confirmed."); void syncSavedCheckout(activeOrder, true); },
        },
      });
      checkout.on("payment.failed", result => setError(result.error?.description || "Payment failed. You can retry this test order."));
      checkout.open();
    } catch (checkoutError) { setError(checkoutError instanceof Error ? checkoutError.message : "Could not start checkout."); }
    finally { setBusy(false); }
  }

  return (
    <main className="cart-page">
      <header className="detail-header">
        <Link className="wordmark" href="/">kalacar<span>.</span><small>SMALL DEVOTIONAL MURTIS</small></Link>
        <div className="detail-header-links"><Link className="back-to-shop" href="/account">Account & orders</Link><Link className="back-to-shop" href="/#catalogue">← Continue shopping</Link></div>
      </header>
      <section className="cart-content">
        <p className="eyebrow">YOUR SELECTION</p>
        <h1>Your bag</h1>
        <p className="cart-demo-banner">RAZORPAY TEST MODE · Preview prices only. No live payment will be taken.</p>
        {savedCheckout && !success && <div className="saved-checkout-banner" role="status"><div><strong>{savedCheckout.orderId ? `Saved checkout · ${savedCheckout.orderId.slice(0, 8).toUpperCase()}` : "Checkout request saved"}</strong><p>{paymentStatus ? `Latest status: ${paymentStatus.replaceAll("_", " ")}.` : savedCheckout.orderId ? "If you left the payment window, the order is still saved." : "Continue checkout with the same cart so the server can resume the saved request."} Check the status before attempting payment again.</p></div><div>{savedCheckout.orderId && <button type="button" className="sync-order-button" disabled={busy} onClick={() => void syncSavedCheckout()}>{busy ? "Checking…" : "Check payment"}</button>}<Link href="/account">Account & orders</Link></div></div>}
        {showSuccess && <p className="cart-success" role="status">{success}</p>}

        {catalogueError ? (
          <div className="cart-empty" role="alert"><p>{catalogueError}</p><p>Your saved bag is kept in this browser. Current prices and stock cannot be confirmed, so checkout is unavailable.</p><Link className="continue-button" href="/#catalogue">Return to the catalogue</Link></div>
        ) : catalogueLoading ? (
          <div className="cart-empty" role="status"><p>Checking current product prices and availability…</p></div>
        ) : products.length === 0 ? (
          <div className="cart-empty">
            <p>{lines.length ? "Saved bag items are no longer in the current catalogue." : "Your bag is empty."}</p>
            {lines.length > 0 && <button type="button" className="remove-button" onClick={clear}>Clear saved bag</button>}
            <Link className="continue-button" href="/#catalogue">Explore the murtis</Link>
          </div>
        ) : (
          <>
            <div className="cart-layout">
              <div className="cart-lines">
                {products.map(({ item, quantity }) => (
                  <article className="cart-line" key={item.id}>
                    <Link className="cart-line-image" href={`/products/${item.id}`}>
                      <Image src={item.image} alt={item.imageAlt} fill sizes="110px" />
                    </Link>
                    <div className="cart-line-info">
                      <p className="product-deity">{item.deity}</p>
                      <h2><Link href={`/products/${item.id}`}>{item.name}</Link></h2>
                      <p className="cart-unit-price">{money(item.price)} <span>unit price</span></p>
                      <div className="cart-line-controls">
                        <div className="quantity-control" aria-label={`Quantity for ${item.name}`}>
                          <button type="button" onClick={() => setQuantity(item.id, quantity - 1)} aria-label="Decrease quantity">−</button>
                          <span>{quantity}</span>
                          <button type="button" disabled={!canAdd(item.id)} onClick={() => setQuantity(item.id, quantity + 1)} aria-label="Increase quantity">+</button>
                        </div>
                        <button className="remove-button" type="button" onClick={() => remove(item.id)}>Remove</button>
                      </div>
                    </div>
                    <strong className="cart-line-total">{money(item.price * quantity)}</strong>
                  </article>
                ))}
              </div>
              <aside className="cart-summary">
                <h2>Order summary</h2>
                <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                <div><span>Delivery</span><span>Calculated later</span></div>
                <p>Test checkout reserves current stock and charges product subtotal only. Shipping is not included in this local test.</p>
                {showSuccess ? <div className="demo-checkout-message" role="status">{success}<Link className="account-contact" href="/account">View order status in your account →</Link></div> : <form className="checkout-form" onSubmit={startCheckout}>
                  <h3>Delivery details</h3>
                  {!accountLoaded ? <p className="demo-checkout-message">Loading account…</p> : !account ? <div className="account-checkout-gate"><p>Sign in or create an account before checkout. Your payment status and order history will stay linked to you.</p><Link className="checkout-demo-button" href="/account?next=%2Fcart">Sign in to continue</Link></div> : <>
                  <p className="account-checkout-note">Order updates will be saved to {account.email}.</p>
                  <label>Full name<input required minLength={2} maxLength={160} autoComplete="name" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} /></label>
                  <label>Email<input required type="email" autoComplete="email" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} /></label>
                  <label>Mobile number<input required type="tel" minLength={10} autoComplete="tel" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} /></label>
                  <label>Area, building and street<textarea required minLength={8} maxLength={500} autoComplete="street-address" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} /></label>
                  <label>City or district<input required maxLength={100} autoComplete="address-level2" value={customer.city} onChange={e => setCustomer({ ...customer, city: e.target.value })} /></label>
                  <label>State<input required maxLength={100} autoComplete="address-level1" value={customer.state} onChange={e => setCustomer({ ...customer, state: e.target.value })} /></label>
                  <label>Landmark (optional)<input maxLength={200} autoComplete="off" value={customer.landmark} onChange={e => setCustomer({ ...customer, landmark: e.target.value })} /></label>
                  <label>Delivery instructions (optional)<textarea maxLength={300} autoComplete="off" value={customer.instructions} onChange={e => setCustomer({ ...customer, instructions: e.target.value })} /></label>
                  <label>PIN code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="postal-code" value={customer.pincode} onChange={e => setCustomer({ ...customer, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} /></label>
                  {error && <p className="demo-checkout-message" role="alert">{error}</p>}
                  {verificationData && <button className="checkout-retry-button" type="button" disabled={busy} onClick={() => void verifyPayment(verificationData.orderId, verificationData.payment)}>{busy ? "Checking payment…" : "Retry payment verification"}</button>}
                  <button className="checkout-demo-button" type="submit" disabled={!account || busy || products.some(({item, quantity}) => item.stock < quantity)}>{busy ? "Starting secure checkout…" : "Pay with Razorpay · Test mode"}</button>
                  </>}
                </form>}
                {products.length > 0 && (
                  <section className="cart-add-another" aria-labelledby="cart-add-another-title">
                    <h3 id="cart-add-another-title">Add one more to your bag</h3>
                    {products.map(({ item }) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!canAdd(item.id)}
                        onClick={() => add(item.id)}
                        aria-label={`Add one more ${item.name}`}
                      >
                        {canAdd(item.id) ? `Add one more · ${item.name}` : `Stock limit reached · ${item.name}`}
                      </button>
                    ))}
                  </section>
                )}
              </aside>
            </div>
          </>
        )}
        <a className="account-contact" href="https://wa.me/918830646308?text=Hi%20Kalacar%2C%20I%20need%20help%20with%20my%20order%20or%20payment." target="_blank" rel="noreferrer">Need help with an order or payment? WhatsApp +91 88306 46308 ↗</a>
      </section>
    </main>
  );
}
