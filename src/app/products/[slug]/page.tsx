import ProductDetailClient from "@/components/product-detail-client";

export const instant = false;

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductDetailClient slug={slug} />;
}
