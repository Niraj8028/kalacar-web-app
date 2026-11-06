"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_HOME, DEFAULT_INSTAGRAM, DEFAULT_PRODUCT_PAGE } from "@/data/site-content";
import type { Review, SiteContent } from "@/data/site-content";
import { useLiveLoad } from "@/lib/realtime-client";

type Value = SiteContent & { reviews: Review[] };
const DEFAULTS: Value = { home: DEFAULT_HOME, productPage: DEFAULT_PRODUCT_PAGE, collections: [], instagram: DEFAULT_INSTAGRAM, reviews: [] };
const Context = createContext<Value>(DEFAULTS);

/** Owner's settings and reviews for the whole shop. If they can't load, built-in defaults keep every page working. */
export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<Value>(DEFAULTS);
  const load = useCallback(async () => {
    const [content, reviews] = await Promise.all([
      fetch("/api/site-content", { cache: "no-store" }).then(response => response.ok ? response.json() as Promise<SiteContent> : null).catch(() => null),
      fetch("/api/reviews", { cache: "no-store" }).then(response => response.ok ? response.json() as Promise<{ reviews: Review[] }> : null).catch(() => null),
    ]);
    setValue(current => ({ ...current, ...(content ?? {}), reviews: reviews?.reviews ?? current.reviews }));
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- first load of the owner's settings
  useEffect(() => { void load(); }, [load]);
  useLiveLoad("store", load);
  const memo = useMemo(() => value, [value]);
  return <Context.Provider value={memo}>{children}</Context.Provider>;
}
export const useSiteContent = () => useContext(Context);
