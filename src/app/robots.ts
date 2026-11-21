import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { cachedSeo } from "@/lib/seo-cache";
import { siteOrigin } from "@/lib/seo";

/** Lets Google in when dashboard Settings → "Show the shop on Google" is on. KALACAR_ALLOW_SEARCH=false hides the shop regardless. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  const seo = await cachedSeo();
  if (process.env.KALACAR_ALLOW_SEARCH === "false" || !seo.showOnGoogle) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/account", "/cart", "/checkout", "/order-confirmed"] }, sitemap: `${siteOrigin()}/sitemap.xml` };
}
