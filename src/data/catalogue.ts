export type Deity = "Ganpati" | "Sri Krishna" | "Swami Samarth";

export type StoreItem = {
  id: string;
  name: string;
  deity: Deity;
  image: string;
  imageAlt: string;
  placement: string;
  gallery: string[];
  price: number;
  originalPrice: number;
};

// One representative image per planned item. The remaining owner-provided
// files stay grouped in public/images/catalogue as temporary visual options.
export const storeItems: StoreItem[] = [
  {
    id: "ganpati",
    name: "Ganpati Murti",
    deity: "Ganpati",
    image: "/images/catalogue/ganpati/ganpati-01.jpeg",
    imageAlt: "Seated Ganpati murti against a soft green background",
    placement: "For a car dashboard or Devghar",
    price: 599,
    originalPrice: 799,
    gallery: [
      "/images/catalogue/ganpati/ganpati-01.jpeg",
      "/images/catalogue/ganpati/ganpati-04.jpeg",
      "/images/catalogue/ganpati/ganpati-07.jpeg",
    ],
  },
  {
    id: "sri-krishna",
    name: "Sri Krishna Murti",
    deity: "Sri Krishna",
    image: "/images/catalogue/sri-krishna/sri-krishna-07.webp",
    imageAlt: "Small Sri Krishna murti displayed on a car dashboard",
    placement: "For a car dashboard or Devghar",
    price: 699,
    originalPrice: 899,
    gallery: [
      "/images/catalogue/sri-krishna/sri-krishna-07.webp",
      "/images/catalogue/sri-krishna/sri-krishna-08.webp",
      "/images/catalogue/sri-krishna/sri-krishna-09.webp",
    ],
  },
  {
    id: "swami-samarth",
    name: "Swami Samarth Murti",
    deity: "Swami Samarth",
    image: "/images/catalogue/swami-samarth/swami-samarth-01.jpeg",
    imageAlt: "Seated Swami Samarth murti on a neutral background",
    placement: "For a car dashboard or Devghar",
    price: 749,
    originalPrice: 999,
    gallery: [
      "/images/catalogue/swami-samarth/swami-samarth-01.jpeg",
      "/images/catalogue/swami-samarth/swami-samarth-02.jpeg",
      "/images/catalogue/swami-samarth/swami-samarth-03.jpeg",
    ],
  },
];

export const deityFilters: Array<"All murtis" | Deity> = [
  "All murtis",
  "Ganpati",
  "Sri Krishna",
  "Swami Samarth",
];
