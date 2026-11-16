import { cacheLife, cacheTag } from "next/cache";
import { DEFAULT_SEO, getSeo } from "@/lib/seo";

export const SEO_TAG = "seo";

/** Read once a minute at most; saving in the dashboard clears it straight away. */
export async function cachedSeo() {
  "use cache";
  cacheTag(SEO_TAG);
  cacheLife("minutes");
  return await getSeo().catch(() => DEFAULT_SEO);
}
