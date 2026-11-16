import { permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import ProductDetailClient from "@/components/product-detail-client";
import { currentProductSlug } from "@/lib/catalogue-db";

export const instant = false;

/** An old address (from before a rename or a new permalink) sends the visitor to the product's current one. */
async function currentSlug(slug: string) {
  await connection();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  return await currentProductSlug(slug).catch(() => null);
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ colour?: string | string[] }> }) {
  const { slug } = await params;
  const { colour } = await searchParams;
  const initialColour = typeof colour === "string" && /^[a-z0-9-]{1,80}$/.test(colour) ? colour : "";
  const current = await currentSlug(slug);
  if (current && current !== slug) permanentRedirect(`/products/${current}${initialColour ? `?colour=${initialColour}` : ""}`);
  return <ProductDetailClient slug={slug} initialColour={initialColour} />;
}
