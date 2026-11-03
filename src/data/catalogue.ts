export type ProductAccordion = {
  id: string;
  title: string;
  content: string;
  format?: "rows" | "text";
  active: boolean;
  defaultOpen: boolean;
};

export type StoreItem = {
  id: string;
  name: string;
  deity: string;
  image: string;
  imageAlt: string;
  placement: string;
  accordions: ProductAccordion[];
  gallery: string[];
  price: number;
  originalPrice: number;
  stock: number;
};
