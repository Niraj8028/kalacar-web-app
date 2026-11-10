export type ProductAccordion = {
  id: string;
  title: string;
  content: string;
  format?: "rows" | "text";
  active: boolean;
  defaultOpen: boolean;
};

/** One colour of a product: its own photos, price, regular price and stock. */
export type StoreColour = {
  id: string;
  name: string;
  swatch: string;
  gallery: string[];
  price: number;
  originalPrice: number;
  stock: number;
  sort: number;
  active: boolean;
};

export type StoreItem = {
  id: string;
  name: string;
  /** Main category. */
  deity: string;
  /** Every category the murti appears under, main one first. */
  categories?: string[];
  badge?: string;
  tagline?: string;
  specs?: Array<{ label: string; value: string }>;
  highlights?: string[];
  variants: StoreColour[];
  image: string;
  imageAlt: string;
  placement: string;
  description?: string;
  bundleIds?: string[];
  accordions: ProductAccordion[];
  gallery: string[];
  price: number;
  originalPrice: number;
  stock: number;
};
