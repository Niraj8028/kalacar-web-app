"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSiteContent } from "@/components/site-content-provider";

// Loads the Meta Pixel and Google tags saved in dashboard Settings, once, on every shop page.
type MetaPixel = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[]; push: MetaPixel; loaded: boolean; version: string };
declare global { interface Window { fbq?: MetaPixel; _fbq?: MetaPixel; dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void } }

function addScript(src: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement("script");
  script.async = true; script.src = src;
  document.head.appendChild(script);
}

/** Meta's own base code: calls wait in a queue until fbevents.js arrives. */
function startMetaPixel(id: string) {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) { if (fbq.callMethod) fbq.callMethod(...args); else fbq.queue.push(args); } as MetaPixel;
  fbq.push = fbq; fbq.loaded = true; fbq.version = "2.0"; fbq.queue = [];
  window.fbq = fbq; window._fbq ??= fbq;
  addScript("https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", id);
  fbq("track", "PageView");
}

/** GTM-… IDs load as a tag container (as Google's install code does); G-/AW-/… IDs load gtag.js and are configured. */
function startGoogleTags(ids: string[]) {
  window.dataLayer = window.dataLayer || [];
  // gtag must push the arguments object itself, as Google's code does.
  // eslint-disable-next-line prefer-rest-params
  window.gtag ??= function () { window.dataLayer!.push(arguments); };
  window.gtag("js", new Date());
  const direct = ids.filter(id => !id.startsWith("GTM-"));
  for (const id of ids.filter(id => id.startsWith("GTM-"))) addScript(`https://www.googletagmanager.com/gtm.js?id=${id}`);
  if (direct.length) addScript(`https://www.googletagmanager.com/gtag/js?id=${direct[0]}`);
  for (const id of direct) window.gtag("config", id);
}

export function TrackingTags() {
  const { tracking, ready } = useSiteContent();
  const pathname = usePathname();
  const started = useRef(false);
  const lastPath = useRef(pathname);
  const metaId = tracking?.metaPixelId ?? "", googleIds = (tracking?.googleTagIds ?? []).join(",");
  useEffect(() => {
    if (!ready || started.current || (!metaId && !googleIds)) return;
    started.current = true; lastPath.current = pathname;
    if (metaId) startMetaPixel(metaId);
    if (googleIds) startGoogleTags(googleIds.split(","));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- start once, when the settings first arrive
  }, [ready, metaId, googleIds]);
  // Moving between pages doesn't reload the site, so Meta is told about each new page. Google tags see it themselves.
  useEffect(() => {
    if (!started.current || lastPath.current === pathname) return;
    lastPath.current = pathname;
    window.fbq?.("track", "PageView");
  }, [pathname]);
  return null;
}
