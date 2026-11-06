import type { MetadataRoute } from "next";

/** Blocks search engines until launch, while test products and draft policies are on the site. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.KALACAR_ALLOW_SEARCH !== "true") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/account", "/cart"] } };
}
