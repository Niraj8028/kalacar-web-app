"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { CouponBox, type AppliedCoupon } from "@/components/coupon-box";
import { BagLines, GiftChoice, money } from "@/components/bag-lines";
import { useCart } from "@/components/cart-provider";
import type { RazorpayPaymentSuccess } from "@/types/razorpay";
import { AddressFields, addressSummary, emptyAddress, toDraft } from "@/components/address-fields";
import type { AddressDraft, SavedAddress } from "@/components/address-fields";
import { OrderConfirmation } from "@/components/order-confirmation";
import { DeliveryLine } from "@/components/product-facts";
import { BagIcon, External } from "@/components/icons";


type SavedCheckout = { fingerprint: string; idempotencyKey: string; orderId: string; razorpayOrderId: string; amount: number };
const SAVED_CHECKOUT_KEY = "kalacar.pending-checkout.v1";
// A new address being typed at checkout, kept for this tab only so a refresh or back/forward doesn't lose it.
const ADDRESS_DRAFT_KEY = "kalacar.checkout-draft.v1";
type AddressDraftStore = { customer: AddressDraft; saveAddress: boolean };
function readAddressDraft(): AddressDraftStore | null {
  try {
    const raw = sessionStorage.getItem(ADDRESS_DRAFT_KEY);
    const draft = raw ? JSON.parse(raw) as AddressDraftStore : null;
    return draft && typeof draft.customer === "object" && typeof draft.customer.address === "string" ? draft : null;
  } catch { return null; }
}
const clearAddressDraft = () => { try { sessionStorage.removeItem(ADDRESS_DRAFT_KEY); } catch { /* storage unavailable */ } };
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

/** Does the bag still hold the same items as the saved order? If not, paying the old order mustn't empty it. */
function sameBag(fingerprint: string, lines: Array<{ id: string; variantId?: string }>) {
  try {
    const key = (items: Array<{ id: string; variantId?: string }>) => JSON.stringify([...items].sort((a, b) => `${a.id}:${a.variantId ?? ""}`.localeCompare(`${b.id}:${b.variantId ?? ""}`)));
    return key((JSON.parse(fingerprint) as { items: Array<{ id: string; variantId?: string }> }).items) === key(lines);
  } catch { return false; }
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

/** The full bag page: items on the left, summary and checkout on the right. All prices and stock are decided again by the server at payment. */
export default function BagFlow() {
  const { lines, resolved, subtotal, clear, catalogueLoading, catalogueError, giftOffer, wantGift, setWantGift } = useCart();
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [paidOrderId, setPaidOrderId] = useState("");
  const giftTotal = giftOffer && wantGift ? giftOffer.price : 0;
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponNote, setCouponNote] = useState("");
  const discount = coupon?.discount ?? 0;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verificationData, setVerificationData] = useState<{ orderId: string; payment: RazorpayPaymentSuccess } | null>(null);
  const checkoutKey = useRef({ fingerprint: "", value: "" });
  const [customer, setCustomer] = useState<AddressDraft>(emptyAddress());
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("new");
  const [saveAddress, setSaveAddress] = useState(true);
  const [draftRestored, setDraftRestored] = useState(false);
  const draftReady = useRef(false); // don't overwrite a stored draft before it has been restored
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [account, setAccount] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [savedCheckout, setSavedCheckout] = useState<SavedCheckout | null>(null);
  const [paymentStatus, setPaymentStatus] = useState("");
  const lastAutoSyncAt = useRef(0);
  const products = resolved.map(({ key, product, colour, line }) => ({ key, item: product, colour, quantity: line.quantity }));
  // A success message belongs to the completed order, not to any items added afterward.
  const showSuccess = Boolean(success) && products.length === 0;

  useEffect(() => {
    if (!draftReady.current) return;
    const typed = [customer.address, customer.city, customer.state, customer.pincode, customer.landmark, customer.instructions].some(part => part.trim());
    try {
      if (selectedAddress === "new" && typed) sessionStorage.setItem(ADDRESS_DRAFT_KEY, JSON.stringify({ customer, saveAddress }));
      else sessionStorage.removeItem(ADDRESS_DRAFT_KEY);
    } catch { /* storage unavailable: nothing to keep */ }
  }, [customer, selectedAddress, saveAddress]);

  useEffect(() => {
    if (success && products.length > 0) setSuccess("");
  }, [success, products.length]);

  // Addresses load once per account, so typed details and the chosen address stay.
  const addressesFor = useRef("");
  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" }).then(response => response.json()).then((data: { user: { name: string; email: string; phone: string } | null }) => {
      setAccount(data.user);
      if (data.user && addressesFor.current !== data.user.email) {
        const user = data.user;
        addressesFor.current = user.email;
        setCustomer(previous => ({ ...previous, fullName: previous.fullName || user.name, phone: previous.phone || user.phone }));
        void fetch("/api/account/addresses", { cache: "no-store" }).then(r => r.ok ? r.json() : { addresses: [] }).then((book: { addresses?: SavedAddress[] }) => {
          const list = book.addresses ?? [];
          setSavedAddresses(list);
          const preferred = list.find(a => a.isDefault) ?? list[0];
          const stored = readAddressDraft();
          if (stored) { setSelectedAddress("new"); setCustomer(stored.customer); setSaveAddress(stored.saveAddress); setDraftRestored(true); }
          else if (preferred) { setSelectedAddress(preferred.id); setCustomer(toDraft(preferred)); setSaveAddress(false); }
          draftReady.current = true;
        }).catch(() => undefined);
      }
      if (!data.user) addressesFor.current = "";
      const saved = readSavedCheckout();
      setSavedCheckout(saved);
      if (saved?.orderId && data.user) void syncSavedCheckout(saved, true);
    }).catch(() => undefined).finally(() => setAccountLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /** With the bag emptied, the confirmation screen shows. If it still holds other items, a notice shows instead. */
  function confirmPaid(message: string, bagCleared: boolean, orderId: string) {
    if (bagCleared) { setPaidOrderId(orderId); setSuccess(message); } else setNotice(message);
  }

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
        localStorage.removeItem(SAVED_CHECKOUT_KEY); setSavedCheckout(null); clearAddressDraft(); if (clearCurrentCart) { clear(); setWantGift(false); }
        setError(""); confirmPaid(`Payment confirmed. Order ${saved.orderId.slice(0, 8)} is recorded.`, clearCurrentCart, saved.orderId);
      } else if (!quiet) {
        setError(`The order is still saved as ${result.status?.replaceAll("_", " ")}. Check your account or retry this same order.`);
      } else {
        setError("Payment is not confirmed yet. Your order is saved; check its status before trying again.");
      }
    } catch (e) {
      if (!quiet) setError(e instanceof Error ? e.message : "Could not check payment status. Your saved order is still available in your account.");
    } finally { if (!quiet) setBusy(false); }
  }

  /** Pays the saved order again. The server asks Razorpay first, so a paid order is never charged twice. */
  async function retrySavedCheckout() {
    if (!savedCheckout?.orderId) return;
    const saved = savedCheckout;
    setBusy(true); setError(""); setSuccess("");
    const sameItems = sameBag(saved.fingerprint, lines);
    try {
      const response = await fetch(`/api/account/orders/${saved.orderId}/retry`, { method: "POST" });
      const retry = await response.json() as { status?: string; error?: string; orderId: string; razorpayOrderId: string; amount: number; currency: string; keyId: string; customer: { name: string; email: string; phone: string } };
      if (!response.ok) throw new Error(retry.error || "Could not reopen payment.");
      if (retry.status === "paid") {
        localStorage.removeItem(SAVED_CHECKOUT_KEY); setSavedCheckout(null); clearAddressDraft(); if (sameItems) { clear(); setWantGift(false); }
        setPaymentStatus("paid"); confirmPaid(`This order is already paid. Order ${saved.orderId.slice(0, 8)} is recorded.`, sameItems, saved.orderId);
        return;
      }
      if (!await loadRazorpay() || !window.Razorpay) throw new Error("Razorpay Checkout could not load. Please check your connection and retry.");
      const digits = retry.customer.phone.replace(/\D/g, "");
      const checkout = new window.Razorpay({
        key: retry.keyId, amount: retry.amount, currency: retry.currency, name: "Kalacar",
        description: "Small devotional murti order", order_id: retry.razorpayOrderId,
        prefill: { name: retry.customer.name, email: retry.customer.email, contact: digits.length === 10 ? `+91${digits}` : retry.customer.phone },
        handler: (payment) => void verifyPayment(retry.orderId, payment, sameItems),
        modal: {
          backdropclose: false, escape: false, handleback: false, confirm_close: true,
          ondismiss: () => { setError("Checkout closed. We’re checking the saved order status; don’t place another order while it is being confirmed."); void syncSavedCheckout(saved, true, sameItems); },
        },
      });
      checkout.on("payment.failed", result => { setPaymentStatus("payment_failed"); setError(result.error?.description || "Payment failed. You can retry this order."); });
      checkout.open();
    } catch (retryError) { setError(retryError instanceof Error ? retryError.message : "Could not reopen payment."); }
    finally { setBusy(false); }
  }

  async function verifyPayment(orderId: string, payment: RazorpayPaymentSuccess, clearBag = true) {
    setBusy(true); setError("");
    try {
      const result = await fetch("/api/checkout/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, ...payment }) });
      const verification = await result.json() as { error?: string; status?: string };
      if (!result.ok || verification.status !== "paid") throw new Error(verification.error || "Payment is still being verified.");
      const confirmation = `Payment confirmed in test mode. Order ${orderId.slice(0, 8)} is recorded.`;
      localStorage.removeItem(SAVED_CHECKOUT_KEY); setSavedCheckout(null); clearAddressDraft();
      setVerificationData(null); if (clearBag) { clear(); setWantGift(false); } checkoutKey.current = { fingerprint: "", value: "" };
      confirmPaid(confirmation, clearBag, orderId);
    } catch (verificationError) {
      setVerificationData({ orderId, payment });
      setError(verificationError instanceof Error ? verificationError.message : "Payment verification is pending. Keep this page open and retry.");
    } finally { setBusy(false); }
  }

  async function startCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess(""); setNotice("");
    try {
      if (!await loadRazorpay() || !window.Razorpay) throw new Error("Razorpay Checkout could not load. Please check your connection and retry.");
      const fingerprint = JSON.stringify({ items: [...lines].sort((a, b) => `${a.id}:${a.variantId ?? ""}`.localeCompare(`${b.id}:${b.variantId ?? ""}`)), customer, gift: Boolean(giftOffer && wantGift), coupon: coupon?.code ?? "" });
      const existing = readSavedCheckout();
      if (existing && existing.fingerprint !== fingerprint) {
        if (existing.orderId) await syncSavedCheckout(existing, true, false);
        const status = readSavedCheckout();
        if (status) throw new Error("You already have an unpaid order. Use Retry payment to pay it, or check its status, before starting a different checkout.");
      }
      if (!checkoutKey.current.value || checkoutKey.current.fingerprint !== fingerprint) {
        checkoutKey.current = { fingerprint, value: existing?.fingerprint === fingerprint ? existing.idempotencyKey : crypto.randomUUID() };
      }
      const persisted: SavedCheckout = { fingerprint, idempotencyKey: checkoutKey.current.value, orderId: existing?.fingerprint === fingerprint ? existing.orderId : "", razorpayOrderId: existing?.fingerprint === fingerprint ? existing.razorpayOrderId : "", amount: existing?.fingerprint === fingerprint ? existing.amount : 0 };
      localStorage.setItem(SAVED_CHECKOUT_KEY, JSON.stringify(persisted));
      const response = await fetch("/api/checkout/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idempotencyKey: checkoutKey.current.value, items: resolved.map(({ product, colour, line }) => ({ id: product.id, variantId: colour.id, quantity: line.quantity })), customer, saveAddress: selectedAddress === "new" && saveAddress, giftWrap: Boolean(giftOffer && wantGift), couponCode: coupon?.code ?? null }) });
      const order = await response.json() as { coupon?: boolean; error?: string; orderId: string; razorpayOrderId: string; amount: number; currency: string; keyId: string };
      if (!response.ok) {
        if (response.status === 502) { checkoutKey.current = { fingerprint: "", value: "" }; localStorage.removeItem(SAVED_CHECKOUT_KEY); setSavedCheckout(null); }
        // The coupon stopped applying (expired, used up…): nothing was charged; drop it so the total is honest.
        if (order.coupon) { checkoutKey.current = { fingerprint: "", value: "" }; localStorage.removeItem(SAVED_CHECKOUT_KEY); setSavedCheckout(null); setCoupon(null); throw new Error(`${order.error} The coupon was removed — check the new total and try again.`); }
        throw new Error(order.error || "Could not start checkout.");
      }
      const activeOrder: SavedCheckout = { ...persisted, orderId: order.orderId, razorpayOrderId: order.razorpayOrderId, amount: order.amount };
      localStorage.setItem(SAVED_CHECKOUT_KEY, JSON.stringify(activeOrder)); setSavedCheckout(activeOrder);
      const checkout = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, name: "Kalacar",
        description: "Small devotional murti order", order_id: order.razorpayOrderId,
        prefill: { name: customer.fullName, email: account?.email ?? "", contact: customer.phone.replace(/\D/g, "").length === 10 ? `+91${customer.phone.replace(/\D/g, "")}` : customer.phone },
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

  const total = subtotal - discount + giftTotal;
  const items = resolved.map(({ product, colour, line }) => ({ id: product.id, variantId: colour.id, quantity: line.quantity }));
  const stockProblem = products.some(({ colour, quantity }) => colour.stock < quantity);
  const signIn = () => router.push("/account?next=%2Fcart");
  const totals = <div className="bag-totals">
    <div><span>Subtotal</span><span>{money(subtotal)}</span></div>
    {discount > 0 && <div className="cart-discount"><span>Coupon {coupon?.code}</span><span>−{money(discount)}</span></div>}
    {giftTotal > 0 && <div><span>{giftOffer?.title}</span><span>{money(giftTotal)}</span></div>}
    <div className="bag-total"><span>Total</span><strong>{money(total)}</strong></div>
  </div>;
  const unpaid = savedCheckout && !showSuccess && <div className="bag-unpaid" role="status">
    <strong>{savedCheckout.orderId ? `Unpaid order ${savedCheckout.orderId.slice(0, 8).toUpperCase()}` : "Checkout started"}</strong>
    <p>{paymentStatus === "payment_failed" ? "The last payment didn't go through. You can try again." : savedCheckout.orderId ? "This order is saved and hasn't been paid." : "Continue with the same bag to resume it."}</p>
    {savedCheckout.orderId && <div className="bag-unpaid-actions">
      {account && <button type="button" className="retry-order-button" disabled={busy} onClick={() => void retrySavedCheckout()}>Retry payment</button>}
      <button type="button" className="sync-order-button" disabled={busy} onClick={() => void syncSavedCheckout()}>{busy ? "Checking…" : "Check payment"}</button>
    </div>}
  </div>;
  const help = <a className="bag-help" href="https://wa.me/918830646308?text=Hi%20Kalacar%2C%20I%20need%20help%20with%20my%20order%20or%20payment." target="_blank" rel="noreferrer">Need help? WhatsApp +91 88306 46308 <External /></a>;

  if (showSuccess && paidOrderId) return <div className="bag-page"><OrderConfirmation orderId={paidOrderId} email={account?.email} /></div>;

  return <div className="bag-page">
    <p className="eyebrow">YOUR SELECTION</p>
    <h1>Your bag</h1>
    <p className="bag-test-note">Test mode: no real payment is taken.</p>
    {notice && <p className="account-message" role="status">{notice}</p>}
    {unpaid}
    {showSuccess ? <div className="bag-done" role="status">
      <h3>Thank you</h3>
      <p>{success}</p>
      <Link className="checkout-demo-button" href="/account">View your orders</Link>
      <Link className="bag-text-link" href="/#catalogue">Continue shopping</Link>
    </div> : catalogueError ? <div className="bag-empty" role="alert">
      <p>{catalogueError}</p><p>Your bag is saved in this browser. We can&apos;t confirm prices and stock right now, so checkout is unavailable.</p>
    </div> : catalogueLoading ? <div className="bag-empty" role="status"><p>Checking current prices and stock…</p></div>
    : products.length === 0 ? <div className="bag-empty">
      <BagIcon size={34} />
      <p>{lines.length ? "The items you saved are no longer available." : "Your bag is empty."}</p>
      {lines.length > 0 && <button type="button" className="remove-button" onClick={clear}>Clear saved bag</button>}
      <Link className="checkout-demo-button" href="/#catalogue">Browse murtis</Link>
    </div> : <div className="bag-page-grid">
      <section className="bag-page-items" aria-label="Items in your bag"><BagLines />{help}</section>
      <aside className="bag-page-side">
        <h2>Checkout</h2>
        <form className="checkout-form bag-checkout" onSubmit={startCheckout}>
          <GiftChoice />
          {!accountLoaded ? <p className="demo-checkout-message" role="status">Loading your account…</p> : !account ? <div className="account-checkout-gate">
            <p>Sign in to continue. Your payment status and orders stay linked to your account.</p>
            <button type="button" className="checkout-demo-button" onClick={signIn}>Sign in to continue</button>
          </div> : <>
            <p className="account-checkout-note">Order updates go to {account.email}.</p>
            {draftRestored && selectedAddress === "new" && <p className="draft-restored" role="status">We kept the address you were typing.<button type="button" className="address-link" onClick={() => { clearAddressDraft(); setDraftRestored(false); setCustomer(emptyAddress(account.name, account.phone)); }}>Clear it</button></p>}
            {savedAddresses.length > 0 && <fieldset className="checkout-address-picker">
              <legend>Deliver to</legend>
              {savedAddresses.map(address => <label key={address.id} className={`address-card selectable${selectedAddress === address.id ? " selected" : ""}`}>
                <input type="radio" name="delivery-address" checked={selectedAddress === address.id} onChange={() => { setSelectedAddress(address.id); setCustomer(toDraft(address)); }} />
                <span className="address-card-top"><span className="address-chip">{address.label}</span>{address.isDefault && <span className="address-chip default">Default</span>}</span>
                <strong>{address.fullName}</strong>
                <span>{addressSummary(address)}</span>
                <span className="address-phone">{address.phone}</span>
              </label>)}
              <label className={`address-card selectable new${selectedAddress === "new" ? " selected" : ""}`}>
                <input type="radio" name="delivery-address" checked={selectedAddress === "new"} onChange={() => { setSelectedAddress("new"); setCustomer(emptyAddress(account.name, account.phone)); setSaveAddress(true); }} />
                <strong>+ Deliver to a new address</strong>
              </label>
              <Link className="address-manage" href="/account">Manage saved addresses</Link>
            </fieldset>}
            {selectedAddress === "new" && <>
              <AddressFields idPrefix="checkout" value={customer} onChange={setCustomer} />
              <label className="address-check"><input type="checkbox" checked={saveAddress} onChange={e => setSaveAddress(e.target.checked)} />Save this address for next time</label>
            </>}
            <CouponBox items={items} giftWrap={Boolean(giftOffer && wantGift)} applied={coupon} disabled={busy} onChange={(next, message) => { setCoupon(next); setCouponNote(message ?? ""); }} />
            {couponNote && <p className="coupon-error" role="status">{couponNote}</p>}
            <DeliveryLine />
          </>}
          {totals}
          {error && <p className="demo-checkout-message bag-error" role="alert">{error}</p>}
          {account && <>
            {verificationData && <button className="checkout-retry-button" type="button" disabled={busy} onClick={() => void verifyPayment(verificationData.orderId, verificationData.payment)}>{busy ? "Checking payment…" : "Retry payment verification"}</button>}
            <button className="checkout-demo-button bag-pay" type="submit" disabled={busy || stockProblem}>{busy ? "Starting secure checkout…" : `Pay ${money(total)}`}</button>
            <p className="checkout-policy-note">By paying, you agree to our <Link href="/terms">Terms</Link>. See <Link href="/shipping">Shipping</Link>, <Link href="/returns">Returns and refunds</Link> and <Link href="/privacy">Privacy</Link>.</p>
          </>}
        </form>
      </aside>
    </div>}
  </div>;
}
