/** The web address for a product name or a typed permalink: "Shree Krushna" → "shree-krushna". */
export function slugify(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
}

/** Link to a product page. Products saved before permalinks existed have no slug, so they use their id. */
export const productPath = (item: { id: string; slug?: string }) => `/products/${item.slug || item.id}`;
