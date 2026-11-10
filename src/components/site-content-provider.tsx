"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_BRAND, DEFAULT_FESTIVE, DEFAULT_HOME, DEFAULT_INSTAGRAM, DEFAULT_PRODUCT_PAGE } from "@/data/site-content";
import type { Review, SiteContent } from "@/data/site-content";
import { useLiveLoad } from "@/lib/realtime-client";

type Value = SiteContent & { reviews: Review[]; ready: boolean };
/** A server still on the old single-hero shape: treat it as one slide. */
function withSlides(content: SiteContent | null): SiteContent | null {
  const hero = content?.home?.hero as (SiteContent["home"]["hero"] & Record<string, unknown>) | undefined;
  if (!content || !hero || Array.isArray(hero.slides)) return content;
  return { ...content, home: { ...content.home, hero: { show: hero.show !== false, autoplay: DEFAULT_HOME.hero.autoplay, interval: DEFAULT_HOME.hero.interval, slides: [{ ...DEFAULT_HOME.hero.slides[0], ...hero } as SiteContent["home"]["hero"]["slides"][number]] } } };
}
/** Sections the server doesn't send yet (an older server, or a new setting) use their defaults. */
function withDefaults(content: SiteContent | null): SiteContent | null {
  if (!content) return content;
  const fill = <T extends object>(defaults: T, saved: Partial<T> | undefined) => Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, { ...value, ...(saved as Record<string, object> | undefined)?.[key] }])) as T;
  return { ...content, home: fill(DEFAULT_HOME, content.home), productPage: fill(DEFAULT_PRODUCT_PAGE, content.productPage) };
}
const DEFAULTS: Value = { home: DEFAULT_HOME, productPage: DEFAULT_PRODUCT_PAGE, collections: [], instagram: DEFAULT_INSTAGRAM, festive: DEFAULT_FESTIVE, brand: DEFAULT_BRAND, reviews: [], ready: false };
const Context = createContext<Value>(DEFAULTS);

/** Owner's settings and reviews for the whole shop. If they can't load, built-in defaults keep every page working. */
export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<Value>(DEFAULTS);
  const load = useCallback(async () => {
    const [content, reviews] = await Promise.all([
      fetch("/api/site-content", { cache: "no-store" }).then(response => response.ok ? response.json() as Promise<SiteContent> : null).catch(() => null),
      fetch("/api/reviews", { cache: "no-store" }).then(response => response.ok ? response.json() as Promise<{ reviews: Review[] }> : null).catch(() => null),
    ]);
    setValue(current => ({ ...current, ...(withDefaults(withSlides(content)) ?? {}), reviews: reviews?.reviews ?? current.reviews, ready: true }));
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- first load of the owner's settings
  useEffect(() => { void load(); }, [load]);
  useLiveLoad("store", load);
  const memo = useMemo(() => value, [value]);
  return <Context.Provider value={memo}>{children}</Context.Provider>;
}
export const useSiteContent = () => useContext(Context);
