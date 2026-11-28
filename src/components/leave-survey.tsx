"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { whatsappLink } from "@/data/support";
import { CloseMark } from "@/components/icons";
import { trackOtherEvent } from "@/components/tracking-tags";

// Same keys and wording as the dashboard's list (src/lib/checkout-leads.ts).
const REASONS = [
  { key: "cod", label: "I want Cash on Delivery" },
  { key: "trust", label: "Not sure about the quality or the shop" },
  { key: "delivery", label: "Delivery takes too long" },
  { key: "price", label: "The price feels high" },
  { key: "payment", label: "Payment didn't work" },
  { key: "question", label: "I have a question first" },
  { key: "other", label: "Something else" },
] as const;
const SHOWN_KEY = "kalacar.leave-survey-shown";
export type LeaveSource = "back" | "payment" | "mouse";
export type LeaveSurveyHandle = { open: (source: LeaveSource) => boolean };

const shownThisVisit = () => { try { return sessionStorage.getItem(SHOWN_KEY) === "1"; } catch { return false; } };
const markShown = () => { try { sessionStorage.setItem(SHOWN_KEY, "1"); } catch { /* fine */ } };

/**
 * "What stopped you?" asked once per visit when a shopper leaves checkout: presses back, closes the payment
 * window, or (on a computer) moves the pointer out of the page. Answers go to the owner's dashboard.
 */
export function LeaveSurvey({ ref, enabled, leadId }: { ref?: Ref<LeaveSurveyHandle>; enabled: boolean; leadId: string }) {
  const [source, setSource] = useState<LeaveSource | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const open = (next: LeaveSource) => {
    if (!enabled || shownThisVisit()) return false;
    markShown(); setSource(next); return true;
  };
  useImperativeHandle(ref, () => ({ open }));

  // Back button: one extra history entry on this page, so the first Back asks before leaving.
  useEffect(() => {
    if (!enabled || shownThisVisit()) return;
    window.history.pushState({ ...window.history.state, kalacarLeaveGuard: true }, "");
    const onBack = () => { if (!open("back")) window.history.back(); };
    window.addEventListener("popstate", onBack, { once: true });
    return () => window.removeEventListener("popstate", onBack);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Computers: the pointer leaving through the top of the window (towards the tabs or the address bar).
  useEffect(() => {
    if (!enabled || !window.matchMedia("(pointer: fine)").matches) return;
    const onOut = (event: MouseEvent) => { if (!event.relatedTarget && event.clientY <= 0) open("mouse"); };
    document.addEventListener("mouseout", onOut);
    return () => document.removeEventListener("mouseout", onOut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => { if (source) dialog.current?.focus(); }, [source]);
  if (!source) return null;

  const send = () => {
    if (!chosen.length && !other.trim()) return;
    void fetch("/api/checkout/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: leadId || undefined, reasons: chosen, other: other.trim(), source }), keepalive: true }).catch(() => undefined);
    trackOtherEvent("leave_survey", { reasons: chosen.join(","), source });
  };
  const stay = () => { send(); setSource(null); };
  const leave = () => { send(); const from = source; setSource(null); if (from === "back") window.history.back(); };
  const toggle = (key: string) => setChosen(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);

  return <div className="leave-survey" role="presentation" onKeyDown={event => { if (event.key === "Escape") stay(); }}>
    <div className="leave-survey-panel" role="dialog" aria-modal="true" aria-labelledby="leave-survey-title" tabIndex={-1} ref={dialog}>
      <button type="button" className="leave-survey-close" aria-label="Close and continue checkout" onClick={stay}><CloseMark /></button>
      <h2 id="leave-survey-title">Before you go, what stopped you?</h2>
      <p className="leave-survey-intro">Your answer helps us improve. Your bag is saved.</p>
      <fieldset><legend className="sr-only">Reasons</legend>
        {REASONS.map(reason => <label key={reason.key} className="leave-survey-option"><input type="checkbox" checked={chosen.includes(reason.key)} onChange={() => toggle(reason.key)} />{reason.label}</label>)}
      </fieldset>
      {chosen.includes("question") && <a className="leave-survey-whatsapp" href={whatsappLink("Hi Kalacar, I have a question before ordering.")} target="_blank" rel="noopener noreferrer" onClick={send}>Ask us on WhatsApp</a>}
      {chosen.includes("other") && <label className="leave-survey-other">Tell us more (optional)<textarea maxLength={300} rows={2} value={other} onChange={event => setOther(event.target.value)} /></label>}
      <div className="leave-survey-actions">
        <button type="button" className="checkout-demo-button" onClick={stay}>Continue checkout</button>
        <button type="button" className="leave-survey-exit" onClick={leave}>{chosen.length || other.trim() ? "Send and exit" : "Exit"}</button>
      </div>
    </div>
  </div>;
}
