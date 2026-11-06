"use client";

import { ShopLogo } from "@/components/shop-logo";
import { useLiveLoad } from "@/lib/realtime-client";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type StoreStatus = { open: boolean; previewing: boolean; comingSoonMessage: string; announcement: string };

// These stay reachable while the shop is closed: customers can see their orders, the owner can sign in to preview.
const ALWAYS_OPEN = ["/account", "/shipping", "/returns", "/safe-transit", "/privacy", "/terms"];

/** Shows the owner's banner on every page, and the coming soon page while the shop is closed. The server enforces the same rule. */
export default function StoreGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StoreStatus | null>(null);
  const pathname = usePathname();
  useLiveLoad("store", () => fetch("/api/settings", { cache: "no-store" }).then(response => response.json()).then((data: { store?: StoreStatus }) => { if (data.store) setStatus(data.store); }).catch(() => undefined));
  useEffect(() => {
    let active = true;
    fetch("/api/settings", { cache: "no-store" }).then(response => response.json()).then((data: { store?: StoreStatus }) => { if (active && data.store) setStatus(data.store); }).catch(() => undefined);
    return () => { active = false; };
  }, [pathname]);

  if (status && !status.open && !ALWAYS_OPEN.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
    return <main className="coming-soon">
      <ShopLogo />
      <h1>Coming soon</h1>
      <p>{status.comingSoonMessage}</p>
      <nav aria-label="Shop information"><Link href="/account">Account & orders</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
    </main>;
  }
  return <>
    {status?.previewing && <p className="store-preview-note" role="status">Owner preview: this shop is set to Coming soon, so customers can&apos;t see it.</p>}
    {status?.announcement && <p className="store-announcement" role="status">{status.announcement}</p>}
    {children}
  </>;
}
