import type { RowDataPacket } from "mysql2/promise";
import { addressDb } from "@/lib/catalogue-db";
import { listCategories } from "@/lib/categories";
import { DEFAULT_HOME, DEFAULT_PRODUCT_PAGE, videoEmbed } from "@/data/site-content";
import type { HomeContent, ProductPageContent, Review, SiteContent } from "@/data/site-content";

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

export function parseHome(body: unknown): HomeContent {
  const input = obj(body), d = DEFAULT_HOME;
  const hero = obj(input.hero), buy = obj(hero.buy), explore = obj(hero.explore), grid = obj(input.firstLaunch), soon = obj(input.comingSoon), collections = obj(input.collections), why = obj(input.why), reviews = obj(input.reviews), story = obj(input.story);
  return {
    hero: { show: bool(hero.show, d.hero.show), productId: ids([hero.productId], 1)[0] ?? "", backgroundImage: safeImage(hero.backgroundImage), showEyebrow: bool(hero.showEyebrow, d.hero.showEyebrow), eyebrow: text(hero.eyebrow, 60, d.hero.eyebrow), showTitle: bool(hero.showTitle, d.hero.showTitle), title: text(hero.title, 120, d.hero.title), showDescription: bool(hero.showDescription, d.hero.showDescription), description: text(hero.description, 300, d.hero.description), buy: { show: bool(buy.show, d.hero.buy.show), label: text(buy.label, 40, d.hero.buy.label) || d.hero.buy.label, showPrice: bool(buy.showPrice, d.hero.buy.showPrice) }, explore: { show: bool(explore.show, d.hero.explore.show), label: text(explore.label, 40, d.hero.explore.label) || d.hero.explore.label, link: safeLink(explore.link, d.hero.explore.link) } },
    firstLaunch: { ...described(grid, d.firstLaunch), productIds: ids(grid.productIds, 12) },
    comingSoon: { ...described(soon, d.comingSoon), items: (Array.isArray(soon.items) ? soon.items : []).slice(0, 12).map(item => ({ name: text(obj(item).name, 80), image: safeImage(obj(item).image) })).filter(item => item.name || item.image) },
    collections: described(collections, d.collections),
    why: { ...described(why, d.why), items: (Array.isArray(why.items) ? why.items : []).slice(0, 8).map(item => ({ title: text(obj(item).title, 80), text: text(obj(item).text, 240) })).filter(item => item.title || item.text) },
    reviews: { ...described(reviews, d.reviews), showText: bool(reviews.showText, d.reviews.showText), showVideo: bool(reviews.showVideo, d.reviews.showVideo) },
    story: { ...header(story, d.story), showText: bool(story.showText, d.story.showText), text: text(story.text, 2000), showImage: bool(story.showImage, d.story.showImage), image: safeImage(story.image), showFounder: bool(story.showFounder, d.story.showFounder), founder: text(story.founder, 80) },
  };
}

export function parseProductPage(body: unknown): ProductPageContent {
  const input = obj(body), d = DEFAULT_PRODUCT_PAGE;
  const offer = obj(input.offer), how = obj(input.howMade), faqs = obj(input.faqs), viewers = obj(input.viewers), sales = obj(input.recentSales), sold = obj(input.soldThisWeek), low = obj(input.lowStock), sticky = obj(input.stickyBar), end = obj(input.endLink), help = obj(input.whatsappHelp);
  return {
    offer: { show: bool(offer.show, d.offer.show), title: text(offer.title, 60, d.offer.title), text: text(offer.text, 240) },
    howMade: { show: bool(how.show, d.howMade.show), title: text(how.title, 80, d.howMade.title), message: text(how.message, 1200), showImage: bool(how.showImage, d.howMade.showImage), image: safeImage(how.image), founder: text(how.founder, 80) },
    faqs: { show: bool(faqs.show, d.faqs.show), title: text(faqs.title, 80, d.faqs.title), items: (Array.isArray(faqs.items) ? faqs.items : []).slice(0, 20).map(item => ({ question: text(obj(item).question, 160), answer: text(obj(item).answer, 800) })).filter(item => item.question && item.answer) },
    viewers: { show: bool(viewers.show, d.viewers.show), minimum: whole(viewers.minimum, 1, 100, d.viewers.minimum) },
    recentSales: { show: bool(sales.show, d.recentSales.show), showFirstName: bool(sales.showFirstName, d.recentSales.showFirstName) },
    soldThisWeek: { show: bool(sold.show, d.soldThisWeek.show), minimum: whole(sold.minimum, 1, 1000, d.soldThisWeek.minimum) },
    lowStock: { threshold: whole(low.threshold, 0, 100, d.lowStock.threshold), text: text(low.text, 80, d.lowStock.text) || d.lowStock.text },
    stickyBar: { show: bool(sticky.show, d.stickyBar.show) },
    endLink: { show: bool(end.show, d.endLink.show), label: text(end.label, 60, d.endLink.label) || d.endLink.label, link: safeLink(end.link, d.endLink.link) },
    whatsappHelp: { show: bool(help.show, d.whatsappHelp.show), label: text(help.label, 80, d.whatsappHelp.label) || d.whatsappHelp.label },
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
export const getHome = async () => parseHome(await readRow("home_page"));
export const getProductPage = async () => parseProductPage(await readRow("product_page"));
export const saveHome = (value: HomeContent) => writeRow("home_page", value);
export const saveProductPage = (value: ProductPageContent) => writeRow("product_page", value);

export async function getSiteContent(): Promise<SiteContent> {
  const [home, productPage, categories] = await Promise.all([getHome(), getProductPage(), listCategories()]);
  return { home, productPage, collections: categories.filter(category => category.productCount > 0).map(({ name, productCount, image }) => ({ name, productCount, image })) };
}

// Reviews are entered by the owner from real customers. Ratings shown on the shop are worked out from these.
type ReviewRow = RowDataPacket & { id: number; product_id: string | null; author: string; city: string; rating: number; body: string; photos: unknown; video_url: string; show_on_home: number; published: number };
const toReview = (row: ReviewRow): Review => {
  const photos = typeof row.photos === "string" ? JSON.parse(row.photos) as unknown : row.photos;
  return { id: row.id, productId: row.product_id, author: row.author, city: row.city, rating: row.rating, text: row.body, photos: Array.isArray(photos) ? photos.map(safeImage).filter(Boolean) : [], videoUrl: row.video_url, showOnHome: Boolean(row.show_on_home), published: Boolean(row.published) };
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
  return { value: { productId, author, city: text(input.city, 80), rating, text: reviewText, photos: (Array.isArray(input.photos) ? input.photos : []).map(safeImage).filter(Boolean).slice(0, 6), videoUrl, showOnHome: bool(input.showOnHome, false), published: bool(input.published, true) } };
}
const reviewValues = (r: ReviewInput) => [r.productId, r.author, r.city, r.rating, r.text, JSON.stringify(r.photos), r.videoUrl, r.showOnHome ? 1 : 0, r.published ? 1 : 0];
export async function createReview(review: ReviewInput) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_reviews (product_id,author,city,rating,body,photos,video_url,show_on_home,published) VALUES (?,?,?,?,?,?,?,?,?)", reviewValues(review));
}
export async function updateReview(id: number, review: ReviewInput) {
  const db = await addressDb();
  await db.execute("UPDATE kalacar_reviews SET product_id=?,author=?,city=?,rating=?,body=?,photos=?,video_url=?,show_on_home=?,published=? WHERE id=?", [...reviewValues(review), id]);
}
export async function deleteReview(id: number) {
  const db = await addressDb();
  await db.execute("DELETE FROM kalacar_reviews WHERE id=?", [id]);
}
