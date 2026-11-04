import ProductDetailClient from "@/components/product-detail-client";

export const instant = false;

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ colour?: string | string[] }> }) {
  const { slug } = await params;
  const { colour } = await searchParams;
  const initialColour = typeof colour === "string" && /^[a-z0-9-]{1,80}$/.test(colour) ? colour : "";
  return <ProductDetailClient slug={slug} initialColour={initialColour} />;
}
