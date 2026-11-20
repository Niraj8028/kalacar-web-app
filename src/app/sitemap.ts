import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { listShopProducts } from "@/lib/shop-products";
import { siteOrigin } from "@/lib/seo";

const PAGES = ["about", "contact", "faq", "shipping", "returns", "safe-transit", "privacy", "terms"];

/** Every public page and product, so Google finds them all. Checkout and account pages are left out on purpose. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const origin = siteOrigin();
  const products = await listShopProducts().catch(() => []);
  return [
    { url: `${origin}/`, changeFrequency: "daily", priority: 1 },
    ...products.map(product => ({ url: `${origin}/products/${product.slug}`, lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined, changeFrequency: "weekly" as const, priority: 0.8, images: [product.image].filter(image => image).map(image => image.startsWith("http") ? image : `${origin}${image}`) })),
    ...PAGES.map(page => ({ url: `${origin}/${page}`, changeFrequency: "monthly" as const, priority: 0.4 })),
  ];
}
