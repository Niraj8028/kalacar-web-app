// What the owner edits in the dashboard for the home and product pages. No imports, so the shop can
// fall back to these defaults if the settings can't load, and the page never breaks.
export type ButtonField = { show: boolean; label: string; link: string };
/** One slide of the home page hero. */
export type HeroSlide = { productId: string; backgroundImage: string; desktopImage: string; showEyebrow: boolean; eyebrow: string; showTitle: boolean; title: string; showDescription: boolean; description: string; buy: { show: boolean; label: string; showPrice: boolean }; explore: ButtonField };
/** The hero: one or more slides. With several, they slide by swipe, arrows, dots and (optionally) on a timer. */
export type HeroSection = { show: boolean; autoplay: boolean; interval: number; slides: HeroSlide[] };
export const MAX_HERO_SLIDES = 8;
export type ProductGridSection = { show: boolean; showTitle: boolean; title: string; showDescription: boolean; description: string; productIds: string[] };
export type ComingSoonItem = { name: string; image: string };
export type ComingSoonSection = { show: boolean; showTitle: boolean; title: string; showDescription: boolean; description: string; items: ComingSoonItem[] };
export type CollectionsSection = { show: boolean; showTitle: boolean; title: string; showDescription: boolean; description: string };
/** One reason: an optional small icon on the left, title and text on the right. */
export type WhyItem = { title: string; text: string; icon: string };
/** Reasons on the right; on the left the shop logo, or an icon/photo the owner uploads in its place. */
export type WhySection = { show: boolean; showTitle: boolean; title: string; showDescription: boolean; description: string; items: WhyItem[]; showLogo: boolean; logo: string };
/** The product grid. No chosen products means every product; category buttons are optional. */
export type CatalogueSection = { show: boolean; showEyebrow: boolean; eyebrow: string; showTitle: boolean; title: string; showDescription: boolean; description: string; productIds: string[]; showFilters: boolean };
/** Heading above the Google reviews (home page, and product pages when turned on). The reviews themselves stay fixed. */
export type GoogleReviewsSection = { show: boolean; showEyebrow: boolean; eyebrow: string; showTitle: boolean; title: string; showDescription: boolean; description: string };
export type ReviewsSection = { show: boolean; showTitle: boolean; title: string; showDescription: boolean; description: string; showText: boolean; showVideo: boolean };
export type StorySection = { show: boolean; showTitle: boolean; title: string; showText: boolean; text: string; showImage: boolean; image: string; showFounder: boolean; founder: string };
/** One featured murti below the hero: owner's heading, one photo (or a collage made as one image), and the product's own name, price and rating. */
export type SpotlightSection = { show: boolean; showTitle: boolean; title: string; showDescription: boolean; description: string; productId: string; image: string; showLogo: boolean; whatsapp: { show: boolean; label: string } };
export type HomeContent = { hero: HeroSection; spotlight: SpotlightSection; firstLaunch: ProductGridSection; comingSoon: ComingSoonSection; collections: CollectionsSection; catalogue: CatalogueSection; why: WhySection; googleReviews: GoogleReviewsSection; reviews: ReviewsSection; story: StorySection };

export const POPUP_SIZES = ["small", "medium", "large"] as const;
export type PopupSize = typeof POPUP_SIZES[number];
export type FaqItem = { question: string; answer: string };
export type ProductPageContent = {
  offer: { show: boolean; title: string; text: string };
  howMade: { show: boolean; title: string; message: string; showImage: boolean; image: string; founder: string };
  faqs: { show: boolean; title: string; items: FaqItem[] };
  viewers: { show: boolean; minimum: number };
  /** Pop-up about a real recent purchase: how often it appears, how long it stays, its size, and where. */
  recentSales: { show: boolean; showFirstName: boolean; showImage: boolean; everyPage: boolean; delay: number; duration: number; size: PopupSize };
  /** "N sold in the last X hours" from real paid orders. `hours` is the time window. */
  soldThisWeek: { show: boolean; minimum: number; hours: number };
  lowStock: { threshold: number; text: string };
  stickyBar: { show: boolean };
  endLink: { show: boolean; label: string; link: string };
  whatsappHelp: { show: boolean; label: string };
  /** The small line above the product name. {category} becomes the product's category. */
  eyebrow: { show: boolean; text: string };
  /** Off hides the number in stock ("Only 2 left", "5 in stock"); shoppers still see in stock or sold out. */
  stockCount: { show: boolean };
  /** The same Google reviews section as the home page, near the end of the product page. */
  googleReviews: { show: boolean };
  /** "Delivered in {estimate}." on the product page, bag, checkout, order confirmed and the order email; `free` adds "Free delivery" to it, `freeUnderStock` also shows it under "In stock". */
  delivery: { estimate: string; note: string; free: { show: boolean; text: string }; freeUnderStock: { show: boolean } };
  /** Off hides the green "In stock" in the buy box; low stock and out of stock messages still show. */
  inStock: { show: boolean };
  /** Icons with a short promise each, under the Buy buttons. */
  trustStrip: { show: boolean; items: TrustItem[] };
  /** "Order today, get it between {from} – {to}." from the delivery time, skipping Sundays. Orders after `cutoffHour` (India time) count from the next day. */
  deliveryDates: { show: boolean; cutoffHour: number; text: string; note: string };
  /** The Buy now button: its words, an icon before them, and small payment labels under them. */
  buyNow: { label: string; icon: TrustIcon; showMarks: boolean; marks: string };
  /** Bag and checkout totals: the small trust promises (bag and checkout), the free delivery row, the tax note and the coupon saving. */
  bagTrust: { showLine: boolean; delivery: { show: boolean; label: string; value: string }; taxNote: { show: boolean; text: string }; youSave: { show: boolean; text: string } };
  /** The checkout page's title, large and green with its icon. Off: the plain "Checkout" title. */
  secureCheckout: { show: boolean; icon: TrustIcon; label: string };
  /** The box just above Pay: who handles payment, the ways to pay, and a short note. */
  paymentBox: { show: boolean; icon: TrustIcon; title: string; marks: string; note: string };
  /** The Pay button. {total} becomes the amount. */
  payButton: { label: string; icon: TrustIcon };
  /** Round WhatsApp button on every page. `label` is the small bubble (empty: none). {product} is the murti on product pages. */
  whatsappFloat: { show: boolean; label: string; message: string; productMessage: string };
  /** Asked when someone leaves: Back or closing payment at checkout (`show`), or Back on the page they arrived on (`siteShow`). */
  leaveSurvey: LeaveSurveySettings;
  /** A step on the order confirmed page, e.g. a photo of the murti on WhatsApp before dispatch. */
  preDispatch: { show: boolean; title: string; text: string };
};
/** "none" shows no icon. */
export const TRUST_ICONS = ["none", "delivery", "breakage", "secure", "whatsapp", "photo", "gift", "check", "star", "heart", "phone"] as const;
export type TrustIcon = typeof TRUST_ICONS[number];
export type TrustItem = { icon: TrustIcon; title: string; text: string };
export const MAX_TRUST_ITEMS = 4;
export const LEAVE_REASON_KEYS = ["cod", "trust", "delivery", "price", "payment", "question", "other"] as const;
export type LeaveReasonKey = typeof LEAVE_REASON_KEYS[number];
export type LeaveSurveySettings = {
  show: boolean; siteShow: boolean; title: string; intro: string; siteIntro: string;
  /** The big "talk to a real person" box above the questions. */
  contact: { show: boolean; title: string; text: string; whatsappLabel: string; whatsappMessage: string; showCall: boolean; callLabel: string };
  showQuestions: boolean; reasons: { key: LeaveReasonKey; label: string; show: boolean }[];
  continueLabel: string; siteContinueLabel: string; exitLabel: string;
};

export const DEFAULT_HERO_SLIDE: HeroSlide = { productId: "", backgroundImage: "", desktopImage: "", showEyebrow: true, eyebrow: "THE KALACAR SHOP", showTitle: true, title: "Small murtis, close to home.", showDescription: true, description: "A focused collection of small devotional murtis for your car, Devghar, or a quiet corner at home.", buy: { show: true, label: "Buy now", showPrice: true }, explore: { show: true, label: "Explore collections", link: "#catalogue" } };
export const DEFAULT_HOME: HomeContent = {
  hero: { show: true, autoplay: true, interval: 5, slides: [DEFAULT_HERO_SLIDE] },
  firstLaunch: { show: false, showTitle: true, title: "Our First Launch", showDescription: false, description: "", productIds: [] },
  comingSoon: { show: false, showTitle: true, title: "Coming Soon", showDescription: false, description: "", items: [] },
  collections: { show: false, showTitle: true, title: "Our Collections", showDescription: false, description: "" },
  catalogue: { show: true, showEyebrow: true, eyebrow: "FEATURED", showTitle: true, title: "Murtis for everyday spaces", showDescription: false, description: "", productIds: [], showFilters: false },
  why: { show: false, showTitle: true, title: "Why choose Kalacar", showDescription: true, description: "Small murtis made with devotion, checked and packed by us, and sent safely to your home.", items: [{ title: "Made for small spaces", text: "Sized for car dashboards, Devghars and work desks, so Bhagwan stays with you wherever you go.", icon: "" }, { title: "Crafted with care", text: "Made by the same hands as our sister studio Murtiverse, with fine detail on every face and ornament.", icon: "" }, { title: "Checked before it ships", text: "We look over every murti ourselves before it leaves us, so it reaches you just as it should.", icon: "" }, { title: "Packed for a safe journey", text: "Wrapped and boxed with care so your murti arrives safely at your door.", icon: "" }], showLogo: true, logo: "" },
  googleReviews: { show: true, showEyebrow: true, eyebrow: "Google reviews", showTitle: true, title: "Loved by devotees", showDescription: true, description: "Real Google reviews of Murtiverse, our sister studio. Same hands, same care." },
  reviews: { show: false, showTitle: true, title: "Customer love", showDescription: false, description: "", showText: true, showVideo: true },
  story: { show: false, showTitle: true, title: "Our Story", showText: true, text: "", showImage: true, image: "", showFounder: true, founder: "" },
  spotlight: { show: false, showTitle: true, title: "Bring home the divine", showDescription: true, description: "", productId: "", image: "", showLogo: true, whatsapp: { show: true, label: "Order on WhatsApp" } },
};

export const DEFAULT_PRODUCT_PAGE: ProductPageContent = {
  offer: { show: false, title: "Offer", text: "" },
  howMade: { show: false, title: "How it's made", message: "", showImage: true, image: "", founder: "" },
  faqs: { show: false, title: "FAQs", items: [] },
  viewers: { show: false, minimum: 2 },
  recentSales: { show: false, showFirstName: false, showImage: true, everyPage: false, delay: 8, duration: 8, size: "medium" },
  soldThisWeek: { show: false, minimum: 3, hours: 168 },
  lowStock: { threshold: 3, text: "Only {count} left. Order soon." },
  stickyBar: { show: true },
  endLink: { show: true, label: "Explore more murtis", link: "/#catalogue" },
  whatsappHelp: { show: true, label: "Have questions? Chat on WhatsApp" },
  eyebrow: { show: true, text: "{category} · SMALL DEVOTIONAL MURTI" },
  stockCount: { show: false },
  googleReviews: { show: true },
  delivery: { estimate: "3–7 business days", note: "Carefully chosen, packed and shipped by us.", free: { show: true, text: "Free delivery across India" }, freeUnderStock: { show: false } },
  inStock: { show: true },
  trustStrip: { show: true, items: [
    { icon: "delivery", title: "Free delivery", text: "Across India" },
    { icon: "breakage", title: "Breakage covered", text: "Free replacement" },
    { icon: "photo", title: "Photo before dispatch", text: "Of your actual murti, on WhatsApp" },
    { icon: "secure", title: "Secure payment", text: "UPI, cards and net banking" },
  ] },
  deliveryDates: { show: true, cutoffHour: 14, text: "Order today, get it between {from} – {to}.", note: "Exact date depends on your PIN code." },
  buyNow: { label: "Buy now", icon: "secure", showMarks: true, marks: "UPI, GPay, PhonePe, Paytm" },
  bagTrust: { showLine: true, delivery: { show: true, label: "Delivery", value: "FREE" }, taxNote: { show: true, text: "Inclusive of all taxes" }, youSave: { show: true, text: "You save {amount} on this order" } },
  secureCheckout: { show: true, icon: "secure", label: "Secure checkout" },
  paymentBox: { show: true, icon: "secure", title: "Pay securely with Razorpay", marks: "UPI, GPay, PhonePe, Paytm, Visa, Mastercard, RuPay", note: "You choose UPI, card or net banking in the next step. All payments are encrypted, and we never see or store your card or UPI details." },
  payButton: { label: "Pay {total} securely", icon: "secure" },
  whatsappFloat: { show: true, label: "Questions? Chat with us", message: "Hi Kalacar, I have a question.", productMessage: "Hi Kalacar, I have a question about {product}." },
  leaveSurvey: {
    show: true, siteShow: true, title: "Before you go", intro: "Your bag is saved. Tell us what stopped you, or talk to us first.", siteIntro: "Have a question before you decide? Talk to us, or tell us what's missing.",
    contact: { show: true, title: "Talk to a real person", text: "Have a question about the murti, delivery or payment? We reply on WhatsApp, usually within minutes.", whatsappLabel: "Chat on WhatsApp", whatsappMessage: "Hi Kalacar, I have a question before ordering.", showCall: true, callLabel: "Call us" },
    showQuestions: true,
    reasons: [
      { key: "cod", label: "I want Cash on Delivery", show: true },
      { key: "trust", label: "Not sure about the quality or the shop", show: true },
      { key: "delivery", label: "Delivery takes too long", show: true },
      { key: "price", label: "The price feels high", show: true },
      { key: "payment", label: "Payment didn't work", show: true },
      { key: "question", label: "I have a question first", show: true },
      { key: "other", label: "Something else", show: true },
    ],
    continueLabel: "Continue checkout", siteContinueLabel: "Keep browsing", exitLabel: "Exit",
  },
  preDispatch: { show: true, title: "We send you a photo", text: "Before we ship, we'll WhatsApp you a photo of your actual murti, so you can see exactly what you're getting." },
};

export type Review = { id: number; productId: string | null; author: string; city: string; rating: number; text: string; photos: string[]; videoUrl: string; showOnHome: boolean; showOnProduct: boolean; published: boolean };
export type ShopCategory = { name: string; image: string; productCount: number };
export type InstagramSettings = { show: boolean; username: string };
/** The shop logo. Empty logo means the built-in one; width 0 means the default size; white turns an uploaded logo white on dark backgrounds. */
export type BrandSettings = { logo: string; width: number; white: boolean };
export const LOGO_WIDTH = { min: 60, max: 320 };
export const DEFAULT_LOGO = "/images/kalakar-logo.png";
export const DEFAULT_BRAND: BrandSettings = { logo: "", width: 0, white: false };
/** Ad and analytics tags on every shop page. Empty means none are loaded. */
export type TrackingSettings = { metaPixelId: string; googleTagIds: string[] };
export const DEFAULT_TRACKING: TrackingSettings = { metaPixelId: "", googleTagIds: [] };
export const MAX_GOOGLE_TAGS = 5;
/** A link in the footer and the phone menu: a page on this site or an https address. */
export type FooterLink = { label: string; link: string };
/** The footer on every page. links null means automatic: published pages with "Show in the footer" on. */
/** Who runs the shop, shown in the footer and on the Contact page. Google Merchant Center checks for these. Empty fields are hidden. */
export type BusinessDetails = { name: string; address: string; email: string; phone: string };
export type FooterSettings = { text: string; showWhatsapp: boolean; links: FooterLink[] | null; business: BusinessDetails };
export const DEFAULT_BUSINESS: BusinessDetails = { name: "", address: "", email: "", phone: "" };
export const DEFAULT_FOOTER: FooterSettings = { text: "Prices and availability reflect the current catalogue.", showWhatsapp: true, links: null, business: DEFAULT_BUSINESS };
export const hasBusinessDetails = (business: BusinessDetails | undefined) => !!business && Object.values(business).some(Boolean);
export const MAX_FOOTER_LINKS = 16;
export const DEFAULT_INSTAGRAM: InstagramSettings = { show: false, username: "" };
export const instagramLink = (username: string) => `https://www.instagram.com/${encodeURIComponent(username)}/`;
export const FESTIVE_OVERLAYS = ["off", "diwali", "ganpati", "janmashtami"] as const;
export type FestiveSettings = { overlay: typeof FESTIVE_OVERLAYS[number] };
export const DEFAULT_FESTIVE: FestiveSettings = { overlay: "off" };
export type SiteContent = { home: HomeContent; productPage: ProductPageContent; collections: ShopCategory[]; instagram: InstagramSettings; festive: FestiveSettings; brand: BrandSettings; tracking?: TrackingSettings; footer?: FooterSettings; testPayments?: boolean };

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
