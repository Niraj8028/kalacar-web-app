"use client";

import { useEffect, useState } from "react";

export type AppliedCoupon = { code: string; discount: number; description: string };
type CartItem = { id: string; variantId?: string; quantity: number };

const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

async function quote(code: string, items: CartItem[], giftWrap: boolean): Promise<AppliedCoupon | { error: string }> {
  try {
    const response = await fetch("/api/checkout/coupon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, items, giftWrap }) });
    const data = await response.json() as { code?: string; discount?: number; description?: string; error?: string };
    if (!response.ok || !data.code) return { error: data.error || "Coupons are temporarily unavailable." };
    return { code: data.code, discount: Number(data.discount), description: data.description ?? "" };
  } catch { return { error: "Coupons are temporarily unavailable. Check your connection." }; }
}

/**
 * "Have a coupon?" in the order summary. The server works out the discount; this only previews it.
 * When the bag changes, an applied coupon is checked again so the shown total stays true.
 */
export function CouponBox({ items, giftWrap, applied, onChange, disabled = false }: { items: CartItem[]; giftWrap: boolean; applied: AppliedCoupon | null; onChange: (coupon: AppliedCoupon | null, message?: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bagKey = JSON.stringify({ items, giftWrap });

  useEffect(() => {
    if (!applied) return;
    let live = true;
    void quote(applied.code, items, giftWrap).then(result => {
      if (!live) return;
      if ("error" in result) { onChange(null, `${applied.code} was removed: ${result.error}`); }
      else if (result.discount !== applied.discount) onChange(result);
    });
    return () => { live = false; };
  // Re-check only when the bag itself changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bagKey]);

  async function apply() {
    const typed = code.trim();
    if (!typed) { setError("Enter a coupon code."); return; }
    setBusy(true); setError("");
    const result = await quote(typed, items, giftWrap);
    setBusy(false);
    if ("error" in result) { setError(result.error); return; }
    setCode(""); setOpen(false); onChange(result);
  }

  if (applied) return <div className="coupon-applied" role="status">
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 12.5V5a1.5 1.5 0 0 1 1.5-1.5h7.5l8 8-9 9z" /><circle cx="8" cy="8" r="1.4" /></svg>
    <span><b>{applied.code}</b><small>{applied.description}</small></span>
    <strong>−{money(applied.discount)}</strong>
    <button type="button" className="address-link" disabled={disabled} onClick={() => { onChange(null); setError(""); }} aria-label={`Remove coupon ${applied.code}`}>Remove</button>
  </div>;

  return <div className="coupon-box">
    {!open ? <button type="button" className="address-link coupon-toggle" disabled={disabled} onClick={() => setOpen(true)} aria-expanded="false">Have a coupon?</button> : <>
      <label className="coupon-label" htmlFor="coupon-code">Coupon code</label>
      <div className="coupon-row">
        <input id="coupon-code" value={code} autoFocus autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={32} placeholder="e.g. DIWALI10" aria-invalid={Boolean(error)} aria-describedby={error ? "coupon-error" : undefined}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void apply(); } }} />
        <button type="button" className="coupon-apply" disabled={busy || disabled} onClick={() => void apply()}>{busy ? "Checking…" : "Apply"}</button>
      </div>
      {error && <p id="coupon-error" className="coupon-error" role="alert">{error}</p>}
    </>}
  </div>;
}
