import { transitDays } from "@/lib/delivery-dates";
import type { listProducts } from "@/lib/catalogue-db";
import { siteOrigin } from "@/lib/seo";

// What Google shows for a product page, built from the product itself so every new product gets it without extra work.
type Product = Awaited<ReturnType<typeof listProducts>>[number];

/** "CUTE KRISHNA HOLDING BANSURI" reads as shouting in Google; names typed in capitals are shown in title case. */
export function displayName(name: string) {
  return name === name.toUpperCase() ? name.toLowerCase().replace(/\b\p{L}/gu, letter => letter.toUpperCase()) : name;
}

const clip = (text: string, max: number) => text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
const plain = (text: string) => text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const absolute = (path: string) => path.startsWith("http") ? path : `${siteOrigin()}${path.startsWith("/") ? "" : "/"}${path}`;

export function productSeo(product: Product) {
  const name = displayName(product.name);
  const deity = product.deity.trim();
  // People search "Krishna idol for car" and "Krishna murti": the title says idol, the description says murti.
  const title = `${name} – ${deity ? `${deity} ` : ""}Idol for Car Dashboard & Mandir | Kalacar`;
  const about = plain(product.description || product.tagline || "");
  const description = clip(`${about ? `${about.replace(/[.!]?$/, ".")} ` : ""}Small ${deity ? `${deity} ` : ""}murti for your car dashboard, Devghar or home mandir. ₹${product.price}, delivered across India.`, 160);
  return { name, title, description, url: `${siteOrigin()}/products/${product.slug}`, image: product.image ? absolute(product.image) : "" };
}

/** Product details Google can show in results: price, stock, photo. */
/** Free delivery across India, with the delivery time from Product page settings, so Google's shipping matches the site. */
function shippingDetails(estimate: string) {
  const days = transitDays(estimate);
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "INR" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
    ...(days && { deliveryTime: { "@type": "ShippingDeliveryTime", handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" }, transitTime: { "@type": "QuantitativeValue", minValue: Math.max(0, days.min - 1), maxValue: days.max, unitCode: "DAY" } } }),
  };
}

export { transitDays };

export function productJsonLd(product: Product, deliveryEstimate?: string) {
  const seo = productSeo(product);
  const images = [...new Set([product.image, ...product.gallery].filter(Boolean))].slice(0, 6).map(absolute);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: seo.name,
    description: seo.description,
    image: images,
    sku: product.id,
    category: product.deity ? `${product.deity} idols` : "Devotional idols",
    brand: { "@type": "Brand", name: "Kalacar" },
    offers: {
      "@type": "Offer",
      url: seo.url,
      priceCurrency: "INR",
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      ...(deliveryEstimate !== undefined && { shippingDetails: shippingDetails(deliveryEstimate) }),
    },
  };
}

/** Safe inside <script>: a "</script>" typed into a product name can't end the tag. */
export const jsonForScript = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
