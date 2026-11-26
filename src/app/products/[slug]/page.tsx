import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import ProductDetailClient from "@/components/product-detail-client";
import { currentProductSlug } from "@/lib/catalogue-db";
import { listShopProducts } from "@/lib/shop-products";
import { jsonForScript, productJsonLd, productSeo } from "@/lib/product-seo";
import { getProductPage } from "@/lib/site-content";
import { DEFAULT_PRODUCT_PAGE } from "@/data/site-content";

export const instant = false;

/** An old address (from before a rename or a new permalink) sends the visitor to the product's current one. */
async function currentSlug(slug: string) {
  await connection();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  return await currentProductSlug(slug).catch(() => null);
}

async function productFor(slug: string) {
  const products = await listShopProducts().catch(() => []);
  return products.find(product => product.slug === slug) ?? null;
}

/** Each product's own title, description and preview image in Google and on WhatsApp/Facebook shares. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const product = /^[a-z0-9-]{1,80}$/.test(slug) ? await productFor(slug) : null;
  if (!product) return {};
  const seo = productSeo(product);
  return {
    title: seo.title, description: seo.description, alternates: { canonical: seo.url },
    openGraph: { type: "website", url: seo.url, title: seo.title, description: seo.description, siteName: "Kalacar", images: seo.image ? [{ url: seo.image, alt: product.imageAlt || seo.name }] : undefined },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description, images: seo.image ? [seo.image] : undefined },
  };
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ colour?: string | string[] }> }) {
  const { slug } = await params;
  const { colour } = await searchParams;
  const initialColour = typeof colour === "string" && /^[a-z0-9-]{1,80}$/.test(colour) ? colour : "";
  const current = await currentSlug(slug);
  if (current && current !== slug) permanentRedirect(`/products/${current}${initialColour ? `?colour=${initialColour}` : ""}`);
  const product = current ? await productFor(current) : null;
  const delivery = product ? (await getProductPage().catch(() => DEFAULT_PRODUCT_PAGE)).delivery : null;
  return <>
    {product && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonForScript(productJsonLd(product, delivery?.estimate)) }} />}
    <ProductDetailClient slug={slug} initialColour={initialColour} />
  </>;
}
