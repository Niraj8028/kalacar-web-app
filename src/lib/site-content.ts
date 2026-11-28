import type { RowDataPacket } from "mysql2/promise";
import { getPaymentStatus } from "@/lib/payment-status";
import { addressDb } from "@/lib/catalogue-db";
import { getFestive } from "@/lib/festive";
import { getInstagram } from "@/lib/instagram";
import { getBrand } from "@/lib/brand";
import { getTracking } from "@/lib/tracking";
import { listCategories } from "@/lib/categories";
import { MAX_TRUST_ITEMS, TRUST_ICONS, DEFAULT_FOOTER, DEFAULT_HERO_SLIDE, DEFAULT_HOME, DEFAULT_PRODUCT_PAGE, DEFAULT_TRACKING, MAX_FOOTER_LINKS, MAX_HERO_SLIDES, POPUP_SIZES, videoEmbed } from "@/data/site-content";
import type { TrustIcon, BusinessDetails, FooterSettings, HeroSlide, HomeContent, ProductPageContent, Review, SiteContent } from "@/data/site-content";

const text = (value: unknown, max: number, fallback = "") => typeof value === "string" ? value.trim().slice(0, max) : fallback;
const bool = (value: unknown, fallback: boolean) => typeof value === "boolean" ? value : fallback;
const whole = (value: unknown, min: number, max: number, fallback: number) => Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max ? Number(value) : fallback;
const obj = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
/** Only photos stored by this site. */
export const safeImage = (value: unknown) => { const v = text(value, 300); return /^\/(uploads|images)\/[\w./-]+$/.test(v) && !v.includes("..") ? v : ""; };
/** A page on this site, a section on the page, or an https address, so a saved link can't run code. */
export function safeLink(value: unknown, fallback: string) {
  const v = text(value, 300);
  if (/^#[\w-]*$/.test(v) || /^\/(?!\/)[^\s\\]*$/.test(v)) return v;
  try { return new URL(v).protocol === "https:" ? v : fallback; } catch { return fallback; }
}
const ids = (value: unknown, max: number) => Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string" && /^[a-z0-9-]{1,64}$/.test(id)))].slice(0, max) : [];
const header = (input: Record<string, unknown>, defaults: { show: boolean; showTitle: boolean; title: string }) => ({ show: bool(input.show, defaults.show), showTitle: bool(input.showTitle, defaults.showTitle), title: text(input.title, 120, defaults.title) });
const described = (input: Record<string, unknown>, defaults: { show: boolean; showTitle: boolean; title: string; showDescription: boolean; description: string }) => ({ ...header(input, defaults), showDescription: bool(input.showDescription, defaults.showDescription), description: text(input.description, 400, defaults.description) });

function parseSlide(input: Record<string, unknown>): HeroSlide {
  const d = DEFAULT_HERO_SLIDE, buy = obj(input.buy), explore = obj(input.explore);
  return { productId: ids([input.productId], 1)[0] ?? "", backgroundImage: safeImage(input.backgroundImage), desktopImage: safeImage(input.desktopImage), showEyebrow: bool(input.showEyebrow, d.showEyebrow), eyebrow: text(input.eyebrow, 60, d.eyebrow), showTitle: bool(input.showTitle, d.showTitle), title: text(input.title, 120, d.title), showDescription: bool(input.showDescription, d.showDescription), description: text(input.description, 300, d.description), buy: { show: bool(buy.show, d.buy.show), label: text(buy.label, 40, d.buy.label) || d.buy.label, showPrice: bool(buy.showPrice, d.buy.showPrice) }, explore: { show: bool(explore.show, d.explore.show), label: text(explore.label, 40, d.explore.label) || d.explore.label, link: safeLink(explore.link, d.explore.link) } };
}
/** Hero slides. Older saves kept one slide's fields directly on the hero; those become the first slide. */
function parseHero(hero: Record<string, unknown>): HomeContent["hero"] {
  const d = DEFAULT_HOME.hero;
  const slides = Array.isArray(hero.slides) ? hero.slides.slice(0, MAX_HERO_SLIDES).map(slide => parseSlide(obj(slide))) : [parseSlide(hero)];
  return { show: bool(hero.show, d.show), autoplay: bool(hero.autoplay, d.autoplay), interval: whole(hero.interval, 3, 15, d.interval), slides: slides.length ? slides : [DEFAULT_HERO_SLIDE] };
}

export function parseHome(body: unknown): HomeContent {
  const input = obj(body), d = DEFAULT_HOME;
  const hero = obj(input.hero), spot = obj(input.spotlight), spotWhatsapp = obj(obj(input.spotlight).whatsapp), grid = obj(input.firstLaunch), soon = obj(input.comingSoon), collections = obj(input.collections), catalogue = obj(input.catalogue), why = obj(input.why), googleReviews = obj(input.googleReviews), reviews = obj(input.reviews), story = obj(input.story);
  return {
    hero: parseHero(hero),
    firstLaunch: { ...described(grid, d.firstLaunch), productIds: ids(grid.productIds, 12) },
    comingSoon: { ...described(soon, d.comingSoon), items: (Array.isArray(soon.items) ? soon.items : []).slice(0, 12).map(item => ({ name: text(obj(item).name, 80), image: safeImage(obj(item).image) })).filter(item => item.name || item.image) },
    collections: described(collections, d.collections),
    catalogue: { ...described(catalogue, d.catalogue), showEyebrow: bool(catalogue.showEyebrow, d.catalogue.showEyebrow), eyebrow: text(catalogue.eyebrow, 60, d.catalogue.eyebrow), productIds: ids(catalogue.productIds, 60), showFilters: bool(catalogue.showFilters, d.catalogue.showFilters) },
    why: { ...described(why, d.why), items: (Array.isArray(why.items) ? why.items : d.why.items).slice(0, 8).map(item => ({ title: text(obj(item).title, 80), text: text(obj(item).text, 240), icon: safeImage(obj(item).icon) })).filter(item => item.title || item.text), showLogo: bool(why.showLogo, d.why.showLogo), logo: safeImage(why.logo) },
    googleReviews: { ...described(googleReviews, d.googleReviews), showEyebrow: bool(googleReviews.showEyebrow, d.googleReviews.showEyebrow), eyebrow: text(googleReviews.eyebrow, 60, d.googleReviews.eyebrow) },
    reviews: { ...described(reviews, d.reviews), showText: bool(reviews.showText, d.reviews.showText), showVideo: bool(reviews.showVideo, d.reviews.showVideo) },
    story: { ...header(story, d.story), showText: bool(story.showText, d.story.showText), text: text(story.text, 2000), showImage: bool(story.showImage, d.story.showImage), image: safeImage(story.image), showFounder: bool(story.showFounder, d.story.showFounder), founder: text(story.founder, 80) },
    spotlight: { ...header(spot, d.spotlight), showDescription: bool(spot.showDescription, d.spotlight.showDescription), description: text(spot.description, 200), productId: ids([spot.productId], 1)[0] ?? "", image: safeImage(spot.image), showLogo: bool(spot.showLogo, d.spotlight.showLogo), whatsapp: { show: bool(spotWhatsapp.show, d.spotlight.whatsapp.show), label: text(spotWhatsapp.label, 40, d.spotlight.whatsapp.label) || d.spotlight.whatsapp.label } },
  };
}

export function parseProductPage(body: unknown): ProductPageContent {
  const input = obj(body), d = DEFAULT_PRODUCT_PAGE;
  const stockCount = obj(input.stockCount), googleReviews = obj(input.googleReviews), delivery = obj(input.delivery), free = obj(delivery.free), freeUnderStock = obj(delivery.freeUnderStock), inStock = obj(input.inStock);
  const eyebrow = obj(input.eyebrow), offer = obj(input.offer), how = obj(input.howMade), faqs = obj(input.faqs), viewers = obj(input.viewers), sales = obj(input.recentSales), sold = obj(input.soldThisWeek), low = obj(input.lowStock), sticky = obj(input.stickyBar), end = obj(input.endLink), help = obj(input.whatsappHelp);
  return {
    offer: { show: bool(offer.show, d.offer.show), title: text(offer.title, 60, d.offer.title), text: text(offer.text, 240) },
    howMade: { show: bool(how.show, d.howMade.show), title: text(how.title, 80, d.howMade.title), message: text(how.message, 1200), showImage: bool(how.showImage, d.howMade.showImage), image: safeImage(how.image), founder: text(how.founder, 80) },
    faqs: { show: bool(faqs.show, d.faqs.show), title: text(faqs.title, 80, d.faqs.title), items: (Array.isArray(faqs.items) ? faqs.items : []).slice(0, 20).map(item => ({ question: text(obj(item).question, 160), answer: text(obj(item).answer, 800) })).filter(item => item.question && item.answer) },
    viewers: { show: bool(viewers.show, d.viewers.show), minimum: whole(viewers.minimum, 1, 100, d.viewers.minimum) },
    recentSales: { show: bool(sales.show, d.recentSales.show), showFirstName: bool(sales.showFirstName, d.recentSales.showFirstName), showImage: bool(sales.showImage, d.recentSales.showImage), everyPage: bool(sales.everyPage, d.recentSales.everyPage), delay: whole(sales.delay, 3, 120, d.recentSales.delay), duration: whole(sales.duration, 3, 30, d.recentSales.duration), size: POPUP_SIZES.find(size => size === sales.size) ?? d.recentSales.size },
    soldThisWeek: { show: bool(sold.show, d.soldThisWeek.show), minimum: whole(sold.minimum, 1, 1000, d.soldThisWeek.minimum), hours: whole(sold.hours, 1, 720, d.soldThisWeek.hours) },
    lowStock: { threshold: whole(low.threshold, 0, 100, d.lowStock.threshold), text: text(low.text, 80, d.lowStock.text) || d.lowStock.text },
    stickyBar: { show: bool(sticky.show, d.stickyBar.show) },
    endLink: { show: bool(end.show, d.endLink.show), label: text(end.label, 60, d.endLink.label) || d.endLink.label, link: safeLink(end.link, d.endLink.link) },
    whatsappHelp: { show: bool(help.show, d.whatsappHelp.show), label: text(help.label, 80, d.whatsappHelp.label) || d.whatsappHelp.label },
    eyebrow: { show: bool(eyebrow.show, d.eyebrow.show), text: text(eyebrow.text, 80, d.eyebrow.text) },
    stockCount: { show: bool(stockCount.show, d.stockCount.show) },
    googleReviews: { show: bool(googleReviews.show, d.googleReviews.show) },
    delivery: { estimate: text(delivery.estimate, 60, d.delivery.estimate) || d.delivery.estimate, note: text(delivery.note, 160, d.delivery.note), free: { show: bool(free.show, d.delivery.free.show), text: text(free.text, 60, d.delivery.free.text) || d.delivery.free.text }, freeUnderStock: { show: bool(freeUnderStock.show, d.delivery.freeUnderStock.show) } },
    inStock: { show: bool(inStock.show, d.inStock.show) },
    trustStrip: parseTrustStrip(input.trustStrip),
    ...parseTrustSettings(input),
  };
}

async function readRow(name: string) {
  const db = await addressDb();
  const [rows] = await db.execute<(RowDataPacket & { value: unknown })[]>("SELECT value FROM kalacar_settings WHERE name=?", [name]);
  const raw = rows[0]?.value;
  return typeof raw === "string" ? JSON.parse(raw) as unknown : raw;
}
async function writeRow(name: string, value: unknown) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_settings (name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [name, JSON.stringify(value)]);
}
const icon = (value: unknown, fallback: TrustIcon) => (TRUST_ICONS as readonly unknown[]).includes(value) ? value as TrustIcon : fallback;
/** Words the owner can edit: kept as typed (trimmed), or the default when missing or emptied. */
const words = (value: unknown, max: number, fallback: string) => text(value, max) || fallback;

/** Buy now, totals, secure checkout, payment box, Pay, WhatsApp button, leaving questions and the photo promise. */
function parseTrustSettings(input: Record<string, unknown>): Pick<ProductPageContent, "deliveryDates" | "buyNow" | "bagTrust" | "secureCheckout" | "paymentBox" | "payButton" | "whatsappFloat" | "leaveSurvey" | "preDispatch"> {
  const d = DEFAULT_PRODUCT_PAGE;
  const dates = obj(input.deliveryDates), buy = obj(input.buyNow), bag = obj(input.bagTrust), secure = obj(input.secureCheckout), box = obj(input.paymentBox), pay = obj(input.payButton), wa = obj(input.whatsappFloat), leave = obj(input.leaveSurvey), contact = obj(leave.contact), photo = obj(input.preDispatch);
  const bagRow = obj(bag.delivery), tax = obj(bag.taxNote), save = obj(bag.youSave);
  const savedReasons = Array.isArray(leave.reasons) ? leave.reasons.map(obj) : [];
  const ls = d.leaveSurvey, lc = ls.contact;
  return {
    deliveryDates: { show: bool(dates.show, d.deliveryDates.show), cutoffHour: whole(dates.cutoffHour, 0, 23, d.deliveryDates.cutoffHour), text: words(dates.text, 120, d.deliveryDates.text), note: text(dates.note, 120, d.deliveryDates.note) },
    buyNow: { label: words(buy.label, 30, d.buyNow.label), icon: icon(buy.icon, d.buyNow.icon), showMarks: bool(buy.showMarks, d.buyNow.showMarks), marks: text(buy.marks, 100, d.buyNow.marks) },
    bagTrust: {
      showLine: bool(bag.showLine, d.bagTrust.showLine),
      delivery: { show: bool(bagRow.show, d.bagTrust.delivery.show), label: words(bagRow.label, 30, d.bagTrust.delivery.label), value: words(bagRow.value, 20, d.bagTrust.delivery.value) },
      taxNote: { show: bool(tax.show, d.bagTrust.taxNote.show), text: words(tax.text, 60, d.bagTrust.taxNote.text) },
      youSave: { show: bool(save.show, d.bagTrust.youSave.show), text: words(save.text, 80, d.bagTrust.youSave.text) },
    },
    secureCheckout: { show: bool(secure.show, d.secureCheckout.show), icon: icon(secure.icon, d.secureCheckout.icon), label: words(secure.label, 40, d.secureCheckout.label) },
    paymentBox: { show: bool(box.show, d.paymentBox.show), icon: icon(box.icon, d.paymentBox.icon), title: words(box.title, 60, d.paymentBox.title), marks: text(box.marks, 150, d.paymentBox.marks), note: text(box.note, 300, d.paymentBox.note) },
    payButton: { label: words(pay.label, 40, d.payButton.label), icon: icon(pay.icon, d.payButton.icon) },
    whatsappFloat: { show: bool(wa.show, d.whatsappFloat.show), label: text(wa.label, 60, d.whatsappFloat.label), message: words(wa.message, 300, d.whatsappFloat.message), productMessage: words(wa.productMessage, 300, d.whatsappFloat.productMessage) },
    leaveSurvey: {
      show: bool(leave.show, ls.show), siteShow: bool(leave.siteShow, ls.siteShow), title: words(leave.title, 80, ls.title), intro: text(leave.intro, 200, ls.intro), siteIntro: text(leave.siteIntro, 200, ls.siteIntro),
      contact: { show: bool(contact.show, lc.show), title: words(contact.title, 60, lc.title), text: text(contact.text, 300, lc.text), whatsappLabel: words(contact.whatsappLabel, 40, lc.whatsappLabel), whatsappMessage: words(contact.whatsappMessage, 300, lc.whatsappMessage), showCall: bool(contact.showCall, lc.showCall), callLabel: words(contact.callLabel, 40, lc.callLabel) },
      showQuestions: bool(leave.showQuestions, ls.showQuestions),
      // The reasons are fixed (the dashboard counts them); only their words and whether each shows can change.
      reasons: ls.reasons.map(reason => { const saved = savedReasons.find(item => item.key === reason.key) ?? {}; return { key: reason.key, label: words(saved.label, 80, reason.label), show: bool(saved.show, reason.show) }; }),
      continueLabel: words(leave.continueLabel, 40, ls.continueLabel), siteContinueLabel: words(leave.siteContinueLabel, 40, ls.siteContinueLabel), exitLabel: words(leave.exitLabel, 40, ls.exitLabel),
    },
    preDispatch: { show: bool(photo.show, d.preDispatch.show), title: words(photo.title, 60, d.preDispatch.title), text: words(photo.text, 300, d.preDispatch.text) },
  };
}

/** Up to 4 promises with a known icon. A saved empty list stays empty; missing means the defaults. */
function parseTrustStrip(body: unknown): ProductPageContent["trustStrip"] {
  const input = obj(body), d = DEFAULT_PRODUCT_PAGE.trustStrip;
  const items = Array.isArray(input.items) ? input.items.slice(0, MAX_TRUST_ITEMS).map(item => {
    return { icon: icon(obj(item).icon, "secure"), title: text(obj(item).title, 40), text: text(obj(item).text, 60) };
  }).filter(item => item.title) : d.items;
  return { show: bool(input.show, d.show), items };
}
/** Footer text and links. Links without a label or a safe address are dropped; null keeps the automatic list. */
export function parseFooter(body: unknown): FooterSettings {
  const input = obj(body), d = DEFAULT_FOOTER;
  const links = Array.isArray(input.links) ? input.links.slice(0, MAX_FOOTER_LINKS).map(item => ({ label: text(obj(item).label, 60), link: safeLink(obj(item).link, "") })).filter(item => item.label && item.link) : null;
  return { text: text(input.text, 300, d.text), showWhatsapp: bool(input.showWhatsapp, d.showWhatsapp), links, business: parseBusiness(input.business) };
}
/** An email without a plain name@domain shape is dropped, so a typo can't become a broken mailto link. */
export function parseBusiness(body: unknown): BusinessDetails {
  const input = obj(body), email = text(input.email, 120).toLowerCase();
  return { name: text(input.name, 120), address: text(input.address, 300), email: /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/.test(email) ? email : "", phone: text(input.phone, 30).replace(/[^\d+ ()-]/g, "") };
}
export const getFooter = async () => parseFooter(await readRow("footer"));
export const saveFooter = (value: FooterSettings) => writeRow("footer", value);
export const getHome = async () => parseHome(await readRow("home_page"));
export const getProductPage = async () => parseProductPage(await readRow("product_page"));
export const saveHome = (value: HomeContent) => writeRow("home_page", value);
export const saveProductPage = (value: ProductPageContent) => writeRow("product_page", value);

export async function getSiteContent(): Promise<SiteContent> {
  const [home, productPage, categories, instagram, festive, brand, tracking, footer] = await Promise.all([getHome(), getProductPage(), listCategories(), getInstagram(), getFestive(), getBrand(), getTracking().catch(() => DEFAULT_TRACKING), getFooter().catch(() => DEFAULT_FOOTER)]);
  return { home, productPage, instagram, festive, brand, tracking, footer, testPayments: getPaymentStatus().mode === "test", collections: categories.filter(category => category.productCount > 0).map(({ name, productCount, image }) => ({ name, productCount, image })) };
}

// Reviews are entered by the owner from real customers. Ratings shown on the shop are worked out from these.
type ReviewRow = RowDataPacket & { id: number; product_id: string | null; author: string; city: string; rating: number; body: string; photos: unknown; video_url: string; show_on_home: number; show_on_product?: number; published: number };
const toReview = (row: ReviewRow): Review => {
  const photos = typeof row.photos === "string" ? JSON.parse(row.photos) as unknown : row.photos;
  return { id: row.id, productId: row.product_id, author: row.author, city: row.city, rating: row.rating, text: row.body, photos: Array.isArray(photos) ? photos.map(safeImage).filter(Boolean) : [], videoUrl: row.video_url, showOnHome: Boolean(row.show_on_home), showOnProduct: row.show_on_product === undefined ? true : Boolean(row.show_on_product), published: Boolean(row.published) };
};
export async function listReviews({ publishedOnly }: { publishedOnly: boolean }) {
  const db = await addressDb();
  const [rows] = await db.query<ReviewRow[]>(`SELECT * FROM kalacar_reviews ${publishedOnly ? "WHERE published=1" : ""} ORDER BY created_at DESC LIMIT 500`);
  return rows.map(toReview);
}
export type ReviewInput = Omit<Review, "id">;
export function parseReview(body: unknown): { error: string } | { value: ReviewInput } {
  const input = obj(body);
  const author = text(input.author, 80), reviewText = text(input.text, 1500), videoUrl = text(input.videoUrl, 300);
  const rating = whole(input.rating, 1, 5, 0);
  if (!author) return { error: "Enter the customer's name." };
  if (!rating) return { error: "Choose a rating from 1 to 5." };
  if (!reviewText && !videoUrl) return { error: "Add the review text or a video link." };
  if (videoUrl && !videoEmbed(videoUrl)) return { error: "Use a YouTube or Instagram video link." };
  const productId = input.productId === null || input.productId === undefined || input.productId === "" ? null : ids([input.productId], 1)[0];
  if (productId === undefined) return { error: "Choose a valid product." };
  return { value: { productId, author, city: text(input.city, 80), rating, text: reviewText, photos: (Array.isArray(input.photos) ? input.photos : []).map(safeImage).filter(Boolean).slice(0, 6), videoUrl, showOnHome: bool(input.showOnHome, false), showOnProduct: bool(input.showOnProduct, true), published: bool(input.published, true) } };
}
const reviewValues = (r: ReviewInput) => [r.productId, r.author, r.city, r.rating, r.text, JSON.stringify(r.photos), r.videoUrl, r.showOnHome ? 1 : 0, r.showOnProduct ? 1 : 0, r.published ? 1 : 0];
export async function createReview(review: ReviewInput) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_reviews (product_id,author,city,rating,body,photos,video_url,show_on_home,show_on_product,published) VALUES (?,?,?,?,?,?,?,?,?,?)", reviewValues(review));
}
export async function updateReview(id: number, review: ReviewInput) {
  const db = await addressDb();
  await db.execute("UPDATE kalacar_reviews SET product_id=?,author=?,city=?,rating=?,body=?,photos=?,video_url=?,show_on_home=?,show_on_product=?,published=? WHERE id=?", [...reviewValues(review), id]);
}
export async function deleteReview(id: number) {
  const db = await addressDb();
  await db.execute("DELETE FROM kalacar_reviews WHERE id=?", [id]);
}
