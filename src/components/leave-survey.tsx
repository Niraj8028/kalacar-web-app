"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { usePathname } from "next/navigation";
import type { LeaveSurveySettings } from "@/data/site-content";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/data/support";
import { CloseMark, PhoneIcon, WhatsappMark } from "@/components/icons";
import { useSiteContent } from "@/components/site-content-provider";
import { trackOtherEvent } from "@/components/tracking-tags";

// Asked at most once per visit, wherever it comes up first (checkout or leaving the shop).
const SHOWN_KEY = "kalacar.leave-survey-shown";
export type LeaveSource = "back" | "payment" | "mouse" | "site";
export type LeaveSurveyHandle = { open: (source: LeaveSource) => boolean };

const shownThisVisit = () => { try { return sessionStorage.getItem(SHOWN_KEY) === "1"; } catch { return false; } };
const markShown = () => { try { sessionStorage.setItem(SHOWN_KEY, "1"); } catch { /* fine */ } };

/** The panel: a big "talk to a real person" box first, then the owner's questions. */
function LeavePanel({ settings, source, leadId, onStay, onExit }: { settings: LeaveSurveySettings; source: LeaveSource; leadId: string; onStay: () => void; onExit: () => void }) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => { dialog.current?.focus(); }, []);
  const reasons = settings.showQuestions ? settings.reasons.filter(reason => reason.show) : [];
  const answered = chosen.length > 0 || Boolean(other.trim());
  const send = () => {
    if (!answered) return;
    void fetch("/api/checkout/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: leadId || undefined, reasons: chosen, other: other.trim(), source }), keepalive: true }).catch(() => undefined);
    trackOtherEvent("leave_survey", { reasons: chosen.join(","), source });
  };
  const contacted = (how: string) => { send(); trackOtherEvent("leave_contact", { how, source }); };
  const toggle = (key: string) => setChosen(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
  const { contact } = settings;
  return <div className="leave-survey" role="presentation" onKeyDown={event => { if (event.key === "Escape") { send(); onStay(); } }}>
    <div className="leave-survey-panel" role="dialog" aria-modal="true" aria-labelledby="leave-survey-title" tabIndex={-1} ref={dialog}>
      <button type="button" className="leave-survey-close" aria-label="Close" onClick={() => { send(); onStay(); }}><CloseMark /></button>
      <h2 id="leave-survey-title">{settings.title}</h2>
      {(source === "site" ? settings.siteIntro : settings.intro) && <p className="leave-survey-intro">{source === "site" ? settings.siteIntro : settings.intro}</p>}
      {contact.show && <section className="leave-contact" aria-labelledby="leave-contact-title">
        <h3 id="leave-contact-title">{contact.title}</h3>
        {contact.text && <p>{contact.text}</p>}
        <div className="leave-contact-buttons">
          <a className="leave-contact-whatsapp" href={whatsappLink(contact.whatsappMessage)} target="_blank" rel="noopener noreferrer" onClick={() => contacted("whatsapp")}><WhatsappMark size={22} />{contact.whatsappLabel}</a>
          {contact.showCall && <a className="leave-contact-call" href={`tel:+${SUPPORT_WHATSAPP.digits}`} onClick={() => contacted("call")}><PhoneIcon size={18} />{contact.callLabel}</a>}
        </div>
      </section>}
      {reasons.length > 0 && <fieldset><legend className="leave-survey-legend">What stopped you?</legend>
        {reasons.map(reason => <label key={reason.key} className="leave-survey-option"><input type="checkbox" checked={chosen.includes(reason.key)} onChange={() => toggle(reason.key)} />{reason.label}</label>)}
      </fieldset>}
      {chosen.includes("other") && <label className="leave-survey-other">Tell us more (optional)<textarea maxLength={300} rows={2} value={other} onChange={event => setOther(event.target.value)} /></label>}
      <div className="leave-survey-actions">
        <button type="button" className="checkout-demo-button" onClick={() => { send(); onStay(); }}>{source === "site" ? settings.siteContinueLabel : settings.continueLabel}</button>
        <button type="button" className="leave-survey-exit" onClick={() => { send(); onExit(); }}>{settings.exitLabel}</button>
      </div>
    </div>
  </div>;
}

/**
 * At checkout: asked when the shopper presses Back, closes the payment window or (computers) moves the pointer
 * out through the top of the page. Answers go to the owner's dashboard.
 */
export function LeaveSurvey({ ref, enabled, leadId }: { ref?: Ref<LeaveSurveyHandle>; enabled: boolean; leadId: string }) {
  const { leaveSurvey } = useSiteContent().productPage;
  const [source, setSource] = useState<LeaveSource | null>(null);
  const on = enabled && leaveSurvey.show;
  const open = (next: LeaveSource) => {
    if (!on || shownThisVisit()) return false;
    markShown(); setSource(next); return true;
  };
  useImperativeHandle(ref, () => ({ open }));

  // Back: one extra history entry on this page, so the first Back asks before leaving.
  useEffect(() => {
    if (!on || shownThisVisit()) return;
    window.history.pushState({ ...window.history.state, kalacarLeaveGuard: true }, "");
    const onBack = () => { if (!open("back")) window.history.back(); };
    window.addEventListener("popstate", onBack, { once: true });
    return () => window.removeEventListener("popstate", onBack);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  useEffect(() => {
    if (!on || !window.matchMedia("(pointer: fine)").matches) return;
    const onOut = (event: MouseEvent) => { if (!event.relatedTarget && event.clientY <= 0) open("mouse"); };
    document.addEventListener("mouseout", onOut);
    return () => document.removeEventListener("mouseout", onOut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  if (!source) return null;
  return <LeavePanel settings={leaveSurvey} source={source} leadId={leadId} onStay={() => setSource(null)} onExit={() => { const from = source; setSource(null); if (from === "back") window.history.back(); }} />;
}

const SITE_ARMED = "kalacar.leave-site-armed";
const NOT_HERE = ["/checkout", "/cart", "/order-confirmed", "/order-details", "/account"];

/**
 * Leaving the shop: on the page a visitor arrived on from outside (an ad, Google, WhatsApp), the first Back
 * that would leave the shop shows the same panel. Going back and forth inside the shop is never stopped.
 */
export function SiteLeaveGuard() {
  const { productPage, ready } = useSiteContent();
  const pathname = usePathname();
  const settings = productPage.leaveSurvey;
  const [open, setOpen] = useState(false);
  const on = ready && settings.siteShow;
  useEffect(() => {
    if (!on || NOT_HERE.some(path => pathname.startsWith(path))) return;
    let armed = false;
    try { armed = sessionStorage.getItem(SITE_ARMED) === "1"; } catch { return; }
    const fromOutside = !document.referrer || new URL(document.referrer).origin !== window.location.origin;
    if (armed || !fromOutside || shownThisVisit()) return;
    try { sessionStorage.setItem(SITE_ARMED, "1"); } catch { return; }
    // The arrival entry is marked; an extra entry is added on top. Coming back to the marked one means "leaving".
    window.history.replaceState({ ...window.history.state, kalacarArrival: true }, "");
    window.history.pushState({ ...window.history.state, kalacarArrival: false, kalacarSiteGuard: true }, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  useEffect(() => {
    if (!on) return;
    const onBack = (event: PopStateEvent) => {
      if (!(event.state as { kalacarArrival?: boolean } | null)?.kalacarArrival) return;
      if (shownThisVisit()) { window.history.back(); return; }
      markShown(); setOpen(true);
    };
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, [on]);
  if (!open) return null;
  return <LeavePanel settings={settings} source="site" leadId="" onStay={() => setOpen(false)} onExit={() => { setOpen(false); window.history.back(); }} />;
}
