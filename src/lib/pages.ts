import type { RowDataPacket } from "mysql2/promise";
import sanitizeHtml from "sanitize-html";
import { addressDb } from "@/lib/catalogue-db";
import { PAGE_DEFAULTS } from "@/data/page-defaults";

// Info and policy pages. Saved edits live in the database; a page with no edits uses its starting text.
export type SitePage = { slug: string; title: string; intro: string; content: string; seoTitle: string; seoDescription: string; published: boolean; inFooter: boolean; hasForm: boolean; draft: boolean };

/** Runs on save and again on display, so a page can only ever contain simple formatting. */
export function cleanPageHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["h2", "h3", "p", "ul", "ol", "li", "strong", "em", "u", "s", "a", "blockquote", "br", "hr", "mark"],
    allowedAttributes: { a: ["href", "target", "rel"], mark: ["class"] },
    allowedClasses: { mark: ["policy-confirm"] },
    allowedSchemes: ["https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    transformTags: { a: (tagName, attribs) => attribs.target ? { tagName, attribs: { ...attribs, rel: "noopener noreferrer" } } : { tagName, attribs } },
  });
}
const isDraft = (html: string) => html.includes("policy-confirm");
type Row = RowDataPacket & { slug: string; title: string; intro: string; content: string; seo_title: string; seo_description: string; published: number; in_footer: number };

function merge(slug: string, row?: Row): SitePage | null {
  const base = PAGE_DEFAULTS.find(page => page.slug === slug);
  if (!base) return null;
  const content = cleanPageHtml(row?.content ?? base.content);
  return { slug, title: row?.title ?? base.title, intro: row?.intro ?? base.intro, content, seoTitle: row?.seo_title ?? "", seoDescription: row?.seo_description ?? base.seoDescription, published: row ? Boolean(row.published) : true, inFooter: row ? Boolean(row.in_footer) : true, hasForm: base.form === "contact", draft: isDraft(content) };
}
export const defaultPage = (slug: string) => merge(slug);
export async function listPages() {
  const db = await addressDb();
  const [rows] = await db.query<Row[]>("SELECT * FROM kalacar_pages");
  return PAGE_DEFAULTS.map(page => merge(page.slug, rows.find(row => row.slug === page.slug))!).filter(Boolean);
}
export async function getPage(slug: string) {
  const db = await addressDb();
  const [rows] = await db.execute<Row[]>("SELECT * FROM kalacar_pages WHERE slug=?", [slug]);
  return merge(slug, rows[0]);
}
export function parsePage(body: unknown): { error: string } | { value: Omit<SitePage, "slug" | "hasForm" | "draft"> } {
  const input = (body ?? {}) as Record<string, unknown>;
  const text = (key: string, max: number) => typeof input[key] === "string" ? input[key].trim().slice(0, max) : "";
  const title = text("title", 120);
  if (title.length < 2) return { error: "Give the page a title." };
  const content = typeof input.content === "string" ? cleanPageHtml(input.content) : "";
  if (content.length > 60000) return { error: "This page is too long. Please shorten it." };
  return { value: { title, intro: text("intro", 300), content, seoTitle: text("seoTitle", 70), seoDescription: text("seoDescription", 170), published: input.published !== false, inFooter: input.inFooter !== false } };
}
export async function savePage(slug: string, page: Omit<SitePage, "slug" | "hasForm" | "draft">) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_pages (slug,title,intro,content,seo_title,seo_description,published,in_footer) VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),intro=VALUES(intro),content=VALUES(content),seo_title=VALUES(seo_title),seo_description=VALUES(seo_description),published=VALUES(published),in_footer=VALUES(in_footer)", [slug, page.title, page.intro, page.content, page.seoTitle, page.seoDescription, page.published ? 1 : 0, page.inFooter ? 1 : 0]);
}
export async function resetPage(slug: string) {
  const db = await addressDb();
  await db.execute("DELETE FROM kalacar_pages WHERE slug=?", [slug]);
}

// Messages from the Contact page.
export type Inquiry = { id: number; name: string; email: string; phone: string; message: string; handled: boolean; createdAt: string };
export function parseInquiry(body: unknown): { error: string } | { value: { name: string; email: string; phone: string; message: string } } {
  const input = (body ?? {}) as Record<string, unknown>;
  const text = (key: string, max: number) => typeof input[key] === "string" ? input[key].trim().slice(0, max + 1) : "";
  const name = text("name", 120), email = text("email", 190), phone = text("phone", 20), message = text("message", 2000);
  if (name.length < 2 || name.length > 120) return { error: "Enter your name." };
  if (email.length > 190 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (phone && !/^[+\d][\d\s-]{6,18}$/.test(phone)) return { error: "Enter a valid phone number, or leave it empty." };
  if (message.length < 5) return { error: "Please write your message." };
  if (message.length > 2000) return { error: "Keep your message to 2,000 characters." };
  return { value: { name, email, phone, message } };
}
export async function saveInquiry(inquiry: { name: string; email: string; phone: string; message: string }) {
  const db = await addressDb();
  await db.execute("INSERT INTO kalacar_inquiries (name,email,phone,message) VALUES (?,?,?,?)", [inquiry.name, inquiry.email, inquiry.phone, inquiry.message]);
}
export async function listInquiries(): Promise<Inquiry[]> {
  const db = await addressDb();
  const [rows] = await db.query<(RowDataPacket & { id: number; name: string; email: string; phone: string; message: string; handled: number; created_at: Date })[]>("SELECT * FROM kalacar_inquiries ORDER BY created_at DESC LIMIT 300");
  return rows.map(row => ({ id: row.id, name: row.name, email: row.email, phone: row.phone, message: row.message, handled: Boolean(row.handled), createdAt: new Date(row.created_at).toISOString() }));
}
export async function setInquiryHandled(id: number, handled: boolean) {
  const db = await addressDb();
  await db.execute("UPDATE kalacar_inquiries SET handled=? WHERE id=?", [handled ? 1 : 0, id]);
}
export async function deleteInquiry(id: number) {
  const db = await addressDb();
  await db.execute("DELETE FROM kalacar_inquiries WHERE id=?", [id]);
}
