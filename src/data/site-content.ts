// What the owner edits in the dashboard for the home and product pages. No imports, so the shop can
// fall back to these defaults if the settings can't load, and the page never breaks.
export type ButtonField = { show: boolean; label: string; link: string };
export type HeroSection = { show: boolean; productId: string; backgroundImage: string; desktopImage: string; showEyebrow: boolean; eyebrow: string; showTitle: boolean; title: string; showDescription: boolean; description: string; buy: { show: boolean; label: string; showPrice: boolean }; explore: ButtonField };
export type ProductGridSection = { show: boolean; showTitle: boolean; title: string; showDescription: boolean; description: string; productIds: string[] };
export type ComingSoonItem = { name: string; image: string };
export type ComingSoonSection = { show: boolean; showTitle: boolean; title: string; showDescription: boolean; description: string; items: ComingSoonItem[] };
export type CollectionsSection = { show: boolean; showTitle: boolean; title: string; showDescription: boolean; description: string };
export type WhyItem = { title: string; text: string };
export type WhySection = { show: boolean; showTitle: boolean; title: string; showDescription: boolean; description: string; items: WhyItem[] };
export type ReviewsSection = { show: boolean; showTitle: boolean; title: string; showDescription: boolean; description: string; showText: boolean; showVideo: boolean; follow: { show: boolean; label: string; url: string } };
export type StorySection = { show: boolean; showTitle: boolean; title: string; showText: boolean; text: string; showImage: boolean; image: string; showFounder: boolean; founder: string };
export type HomeContent = { hero: HeroSection; firstLaunch: ProductGridSection; comingSoon: ComingSoonSection; collections: CollectionsSection; why: WhySection; reviews: ReviewsSection; story: StorySection };

export type FaqItem = { question: string; answer: string };
export type ProductPageContent = {
  offer: { show: boolean; title: string; text: string };
  howMade: { show: boolean; title: string; message: string; showImage: boolean; image: string; founder: string };
  faqs: { show: boolean; title: string; items: FaqItem[] };
  viewers: { show: boolean; minimum: number };
  recentSales: { show: boolean; showFirstName: boolean };
  soldThisWeek: { show: boolean; minimum: number };
  lowStock: { threshold: number; text: string };
  stickyBar: { show: boolean };
  endLink: { show: boolean; label: string; link: string };
  whatsappHelp: { show: boolean; label: string };
};

export const DEFAULT_HOME: HomeContent = {
  hero: { show: true, productId: "", backgroundImage: "", desktopImage: "", showEyebrow: true, eyebrow: "THE KALACAR SHOP", showTitle: true, title: "Small murtis, close to home.", showDescription: true, description: "A focused collection of small devotional murtis for your car, Devghar, or a quiet corner at home.", buy: { show: true, label: "Buy now", showPrice: true }, explore: { show: true, label: "Explore collections", link: "#catalogue" } },
  firstLaunch: { show: false, showTitle: true, title: "Our First Launch", showDescription: false, description: "", productIds: [] },
  comingSoon: { show: false, showTitle: true, title: "Coming Soon", showDescription: false, description: "", items: [] },
  collections: { show: false, showTitle: true, title: "Our Collections", showDescription: false, description: "" },
  why: { show: false, showTitle: true, title: "Why choose Kalacar", showDescription: false, description: "", items: [] },
  reviews: { show: false, showTitle: true, title: "Customer love", showDescription: false, description: "", showText: true, showVideo: true, follow: { show: false, label: "Follow us on Instagram", url: "" } },
  story: { show: false, showTitle: true, title: "Our Story", showText: true, text: "", showImage: true, image: "", showFounder: true, founder: "" },
};

export const DEFAULT_PRODUCT_PAGE: ProductPageContent = {
  offer: { show: false, title: "Offer", text: "" },
  howMade: { show: false, title: "How it's made", message: "", showImage: true, image: "", founder: "" },
  faqs: { show: false, title: "FAQs", items: [] },
  viewers: { show: false, minimum: 2 },
  recentSales: { show: false, showFirstName: false },
  soldThisWeek: { show: false, minimum: 3 },
  lowStock: { threshold: 3, text: "Only {count} left. Order soon." },
  stickyBar: { show: true },
  endLink: { show: true, label: "Explore more murtis", link: "/#catalogue" },
  whatsappHelp: { show: true, label: "Have questions? Chat on WhatsApp" },
};

export type Review = { id: number; productId: string | null; author: string; city: string; rating: number; text: string; photos: string[]; videoUrl: string; showOnHome: boolean; published: boolean };
export type ShopCategory = { name: string; image: string; productCount: number };
export type SiteContent = { home: HomeContent; productPage: ProductPageContent; collections: ShopCategory[] };

/** Average and count from real reviews only. */
export function reviewSummary(reviews: Pick<Review, "rating">[]) {
  if (!reviews.length) return null;
  return { count: reviews.length, average: Math.round(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length * 10) / 10 };
}

/** Turns a YouTube or Instagram link into a safe embed address, or null. */
export function videoEmbed(link: string): { kind: "youtube" | "instagram"; src: string } | null {
  let url: URL;
  try { url = new URL(link); } catch { return null; }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id = "";
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (host === "youtube.com") id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1] ?? "";
  if (id) return /^[\w-]{6,20}$/.test(id) ? { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  if (host === "instagram.com") {
    const code = url.pathname.match(/^\/(?:p|reel|reels)\/([\w-]{5,40})/)?.[1];
    return code ? { kind: "instagram", src: `https://www.instagram.com/p/${code}/embed` } : null;
  }
  return null;
}
