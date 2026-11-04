import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { randomBytes } from "node:crypto";
import { addressDb, syncProductSummary } from "@/lib/catalogue-db";
import type { VariantRow } from "@/lib/catalogue-db";

export const MAX_COLOURS = 8;
export const MAX_PHOTOS_PER_COLOUR = 5;

/** One colour as sent by the dashboard editor. Photos are existing URLs or indexes into the uploaded files. */
export type ColourInput = {
  id?: string; name: string; swatch: string; price: number; originalPrice: number; stock: number; active: boolean;
  gallery: Array<{ kind: "existing"; src: string } | { kind: "upload"; uploadIndex: number }>;
  expectedPrice?: number; expectedStock?: number;
};
export type SavedColour = Omit<ColourInput, "gallery"> & { gallery: string[] };

const int = (value: unknown, min: number, max: number) => { const n = Number(value); return Number.isSafeInteger(n) && n >= min && n <= max ? n : null; };

/** Validates the editor's colours JSON. Returns an error message or the colours. */
export function parseColours(raw: unknown, uploadCount: number): { error: string } | { value: ColourInput[] } {
  let list: unknown;
  try { list = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return { error: "The colours could not be read. Reload the editor and try again." }; }
  if (!Array.isArray(list) || list.length < 1) return { error: "Add at least one colour." };
  if (list.length > MAX_COLOURS) return { error: `A product can have up to ${MAX_COLOURS} colours.` };
  const names = new Set<string>(); const usedUploads = new Set<number>(); const out: ColourInput[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") return { error: "A colour is incomplete." };
    const c = item as Record<string, unknown>;
    const name = typeof c.name === "string" ? c.name.trim() : "";
    if (name.length < 1 || name.length > 60) return { error: "Give every colour a name (up to 60 characters)." };
    if (names.has(name.toLowerCase())) return { error: `Two colours are both called “${name}”.` };
    names.add(name.toLowerCase());
    const swatch = typeof c.swatch === "string" && /^#[0-9a-f]{6}$/i.test(c.swatch) ? c.swatch.toLowerCase() : null;
    if (!swatch) return { error: `Pick a swatch colour for “${name}”.` };
    const price = int(c.price, 1, 1_000_000), originalPrice = int(c.originalPrice, 1, 1_000_000), stock = int(c.stock, 0, 1_000_000);
    if (price === null) return { error: `“${name}”: price must be a whole number of rupees, ₹1 or more.` };
    if (originalPrice === null || originalPrice < price) return { error: `“${name}”: regular price must be at least the selling price (use the same value for no discount).` };
    if (stock === null) return { error: `“${name}”: stock must be a whole number, 0 or more.` };
    if (!Array.isArray(c.gallery) || c.gallery.length < 1 || c.gallery.length > MAX_PHOTOS_PER_COLOUR) return { error: `“${name}” needs 1 to ${MAX_PHOTOS_PER_COLOUR} photos.` };
    const gallery: ColourInput["gallery"] = [];
    for (const photo of c.gallery as unknown[]) {
      const g = photo as { kind?: unknown; src?: unknown; uploadIndex?: unknown };
      if (g?.kind === "existing" && typeof g.src === "string" && /^\/uploads\/[a-z0-9-]+\.(jpg|png|webp|avif)$|^\/images\/[\w./-]+$/i.test(g.src)) gallery.push({ kind: "existing", src: g.src });
      else if (g?.kind === "upload" && int(g.uploadIndex, 0, uploadCount - 1) !== null && !usedUploads.has(Number(g.uploadIndex))) { usedUploads.add(Number(g.uploadIndex)); gallery.push({ kind: "upload", uploadIndex: Number(g.uploadIndex) }); }
      else return { error: `A photo for “${name}” is invalid. Reload the editor and try again.` };
    }
    const id = typeof c.id === "string" && /^[a-z0-9-]{1,80}$/.test(c.id) ? c.id : undefined;
    out.push({ id, name, swatch, price, originalPrice, stock, active: c.active !== false, gallery,
      expectedPrice: int(c.expectedPrice, 0, 1_000_000) ?? undefined, expectedStock: int(c.expectedStock, 0, 1_000_000) ?? undefined });
  }
  if (usedUploads.size !== uploadCount) return { error: "One or more uploaded photos aren't attached to a colour." };
  if (!out.some(c => c.active)) return { error: "Keep at least one colour visible in the shop." };
  return { value: out };
}

export type ColourSaveResult = { status: "ok"; colours: SavedColour[] } | { status: "not_found" } | { status: "conflict"; colour: string; current: { price: number; stock: number } } | { status: "invalid"; error: string };

/**
 * Replaces a product's colours in one transaction: locks the product and its colours (same locks
 * as checkout), refuses if any existing colour's price/stock changed since the editor loaded it,
 * then inserts/updates/removes colours and refreshes the product summary.
 * `photoUrls` maps each upload index to its saved URL.
 */
export async function saveColours(connection: PoolConnection, productId: string, colours: ColourInput[], photoUrls: string[], allowedExisting: Set<string>): Promise<ColourSaveResult> {
  const [products] = await connection.execute<RowDataPacket[]>("SELECT id FROM kalacar_products WHERE id=? FOR UPDATE", [productId]);
  if (!products.length) return { status: "not_found" };
  const [rows] = await connection.execute<VariantRow[]>("SELECT * FROM kalacar_product_variants WHERE product_id=? FOR UPDATE", [productId]);
  const existing = new Map(rows.map(row => [row.id, row]));
  for (const row of rows) for (const src of (typeof row.gallery === "string" ? JSON.parse(row.gallery) : row.gallery) as string[]) allowedExisting.add(src);
  const saved: SavedColour[] = [];
  for (const [index, colour] of colours.entries()) {
    const gallery = colour.gallery.map(photo => photo.kind === "upload" ? photoUrls[photo.uploadIndex] : photo.src);
    if (colour.gallery.some(photo => photo.kind === "existing" && !allowedExisting.has(photo.src))) return { status: "invalid", error: `A photo for “${colour.name}” doesn't belong to this product.` };
    const row = colour.id ? existing.get(colour.id) : undefined;
    if (colour.id && !row) return { status: "invalid", error: `“${colour.name}” was removed by someone else. Reload the editor.` };
    if (row && ((colour.expectedStock !== undefined && Number(row.stock) !== colour.expectedStock) || (colour.expectedPrice !== undefined && Number(row.price) !== colour.expectedPrice))) {
      return { status: "conflict", colour: colour.name, current: { price: Number(row.price), stock: Number(row.stock) } };
    }
    const id = row?.id ?? `${productId}-${randomBytes(4).toString("hex")}`.slice(0, 80);
    if (row) await connection.execute("UPDATE kalacar_product_variants SET name=?,swatch=?,gallery=?,price=?,original_price=?,stock=?,sort=?,active=? WHERE id=?", [colour.name, colour.swatch, JSON.stringify(gallery), colour.price, colour.originalPrice, colour.stock, index, colour.active ? 1 : 0, id]);
    else await connection.execute("INSERT INTO kalacar_product_variants (id,product_id,name,swatch,gallery,price,original_price,stock,sort,active) VALUES (?,?,?,?,?,?,?,?,?,?)", [id, productId, colour.name, colour.swatch, JSON.stringify(gallery), colour.price, colour.originalPrice, colour.stock, index, colour.active ? 1 : 0]);
    saved.push({ ...colour, id, gallery });
  }
  const keep = new Set(saved.map(colour => colour.id));
  for (const row of rows) if (!keep.has(row.id)) await connection.execute("DELETE FROM kalacar_product_variants WHERE id=?", [row.id]);
  await syncProductSummary(connection, productId);
  return { status: "ok", colours: saved };
}

/** Quick edit of one colour's price and/or stock with the "changed while you were editing" check. */
export async function updateColourQuick(productId: string, variantId: string, values: { price?: number; stock?: number }, expected: { price?: number; stock?: number }) {
  const db = await addressDb();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("SELECT id FROM kalacar_products WHERE id=? FOR UPDATE", [productId]);
    const [rows] = await connection.execute<VariantRow[]>("SELECT * FROM kalacar_product_variants WHERE id=? AND product_id=? FOR UPDATE", [variantId, productId]);
    const row = rows[0];
    if (!row) { await connection.rollback(); return { status: "not_found" as const }; }
    const current = { price: Number(row.price), stock: Number(row.stock) };
    if ((expected.stock !== undefined && current.stock !== expected.stock) || (expected.price !== undefined && current.price !== expected.price)) { await connection.rollback(); return { status: "conflict" as const, current }; }
    const fields: string[] = []; const params: number[] = [];
    if (values.price !== undefined) { fields.push("price=?"); params.push(values.price); if (values.price > Number(row.original_price)) { fields.push("original_price=?"); params.push(values.price); } }
    if (values.stock !== undefined) { fields.push("stock=?"); params.push(values.stock); }
    if (fields.length) await connection.execute<ResultSetHeader>(`UPDATE kalacar_product_variants SET ${fields.join(",")} WHERE id=?`, [...params, variantId]);
    await syncProductSummary(connection, productId);
    await connection.commit();
    return { status: "ok" as const };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
