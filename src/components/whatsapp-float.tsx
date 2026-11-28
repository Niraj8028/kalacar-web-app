"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { whatsappLink } from "@/data/support";
import { CloseMark, WhatsappMark } from "@/components/icons";
import { useSiteContent } from "@/components/site-content-provider";

const BUBBLE_KEY = "kalacar.whatsapp-bubble-closed";
const HIDDEN_ON = ["/order-confirmed"];

/** Round WhatsApp button on every page. On a product page the message names the murti. */
export function WhatsappFloat() {
  const { productPage, ready } = useSiteContent();
  const pathname = usePathname();
  const [bubble, setBubble] = useState(false);
  const setting = productPage.whatsappFloat;
  const quiet = pathname === "/checkout" || pathname === "/cart";
  useEffect(() => {
    if (!ready || !setting.show || !setting.label || quiet) { setBubble(false); return; }
    let closed = false;
    try { closed = sessionStorage.getItem(BUBBLE_KEY) === "1"; } catch { /* storage blocked: show it */ }
    if (closed) return;
    const timer = setTimeout(() => setBubble(true), 4000);
    return () => clearTimeout(timer);
  }, [ready, setting.show, setting.label, quiet]);
  if (!ready || !setting.show || HIDDEN_ON.includes(pathname)) return null;
  const closeBubble = () => { setBubble(false); try { sessionStorage.setItem(BUBBLE_KEY, "1"); } catch { /* fine */ } };
  const open = () => {
    const product = pathname.startsWith("/products/") ? document.querySelector("h1")?.textContent?.trim() : "";
    window.open(whatsappLink(product ? setting.productMessage.replaceAll("{product}", product) : setting.message), "_blank", "noopener,noreferrer");
    closeBubble();
  };
  return <div className={`whatsapp-float${pathname.startsWith("/products/") ? " raised" : ""}`}>
    {bubble && <div className="whatsapp-bubble" role="status">
      <button type="button" className="whatsapp-bubble-text" onClick={open}>{setting.label}</button>
      <button type="button" className="whatsapp-bubble-close" aria-label="Close" onClick={closeBubble}><CloseMark size={14} /></button>
    </div>}
    <button type="button" className="whatsapp-float-button" aria-label="Chat with us on WhatsApp" onClick={open}><WhatsappMark /></button>
  </div>;
}
