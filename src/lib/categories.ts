import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { PoolConnection } from "mysql2/promise";
import { addressDb, productCategories } from "@/lib/catalogue-db";

// Product categories the owner manages in Settings. A product stores its category's name in the
// `deity` column, so renaming a category updates its products in the same transaction.

export type Category = { id: number; name: string; productCount: number; image: string };
type Result = { ok: true; id: number } | { ok: false; status: number; error: string };

export function parseCategoryName(value: unknown): { error: string } | { value: string } {
  const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return name.length < 2 || name.length > 80 ? { error: "Give the category a name (2–80 characters)." } : { value: name };
}

export async function listCategories(): Promise<Category[]> {
  const db = await addressDb();
  // Any product category not yet in the list is added, so every product can be edited.
  await db.execute(`INSERT INTO kalacar_categories (name) SELECT DISTINCT TRIM(p.deity) FROM kalacar_products p
    WHERE TRIM(p.deity) <> '' AND NOT EXISTS (SELECT 1 FROM kalacar_categories c WHERE c.name = TRIM(p.deity))`);
  const [rows] = await db.query<(RowDataPacket & { id: number; name: string; image: string | null; product_count: number })[]>(`SELECT c.id, c.name, c.image, COUNT(p.id) AS product_count
    FROM kalacar_categories c LEFT JOIN kalacar_products p ON p.deity = c.name OR JSON_CONTAINS(COALESCE(p.extra_categories, JSON_ARRAY()), JSON_QUOTE(c.name)) GROUP BY c.id, c.name, c.image ORDER BY c.name`);
  return rows.map(row => ({ id: row.id, name: row.name, image: row.image ?? "", productCount: Number(row.product_count) }));
}

/** Each name's saved spelling; null if any isn't one of the owner's categories. */
export async function findCategoryNames(names: string[]) {
  const found = await Promise.all(names.map(findCategoryName));
  return found.every((name): name is string => Boolean(name)) ? [...new Set(found)] : null;
}

/** Products that list `name` as an extra category: replace it (rename) or drop it (null). */
async function updateExtraCategories(connection: PoolConnection, name: string, next: string | null) {
  const [rows] = await connection.execute<(RowDataPacket & { id: string; deity: string; extra_categories: unknown })[]>("SELECT id, deity, extra_categories FROM kalacar_products WHERE JSON_CONTAINS(COALESCE(extra_categories, JSON_ARRAY()), JSON_QUOTE(?)) FOR UPDATE", [name]);
  for (const row of rows) {
    const extras = productCategories(row.deity, row.extra_categories).slice(1).map(other => other === name ? next : other).filter((other): other is string => Boolean(other) && other !== row.deity);
    await connection.execute("UPDATE kalacar_products SET extra_categories=? WHERE id=?", [JSON.stringify([...new Set(extras)]), row.id]);
  }
}

/** The category's saved spelling, or null if it isn't one of the owner's categories. */
export async function findCategoryName(name: string) {
  const db = await addressDb();
  const [rows] = await db.execute<(RowDataPacket & { name: string })[]>("SELECT name FROM kalacar_categories WHERE name=?", [name.trim()]);
  return rows[0]?.name ?? null;
}

const isDuplicate = (error: unknown) => (error as { code?: string }).code === "ER_DUP_ENTRY";
const duplicate: Result = { ok: false, status: 409, error: "A category with that name already exists." };

export async function createCategory(name: string): Promise<Result> {
  const db = await addressDb();
  try {
    const [result] = await db.execute<ResultSetHeader>("INSERT INTO kalacar_categories (name) VALUES (?)", [name]);
    return { ok: true, id: result.insertId };
  } catch (error) {
    if (isDuplicate(error)) return duplicate;
    throw error;
  }
}

export async function renameCategory(id: number, name: string): Promise<Result> {
  const connection = await (await addressDb()).getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { name: string })[]>("SELECT name FROM kalacar_categories WHERE id=? FOR UPDATE", [id]);
    if (!rows.length) { await connection.rollback(); return { ok: false, status: 404, error: "Category not found." }; }
    await connection.execute("UPDATE kalacar_categories SET name=? WHERE id=?", [name, id]);
    await connection.execute("UPDATE kalacar_products SET deity=? WHERE deity=?", [name, rows[0].name]);
    await updateExtraCategories(connection, rows[0].name, name);
    await connection.commit();
    return { ok: true, id };
  } catch (error) {
    await connection.rollback();
    if (isDuplicate(error)) return duplicate;
    throw error;
  } finally { connection.release(); }
}

/** Refused while it's any product's main category, so a product can never lose its category. */
export async function deleteCategory(id: number): Promise<Result> {
  const connection = await (await addressDb()).getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { name: string })[]>("SELECT name FROM kalacar_categories WHERE id=? FOR UPDATE", [id]);
    if (!rows.length) { await connection.rollback(); return { ok: false, status: 404, error: "Category not found." }; }
    const [used] = await connection.execute<(RowDataPacket & { total: number })[]>("SELECT COUNT(*) AS total FROM kalacar_products WHERE deity=? FOR UPDATE", [rows[0].name]);
    const total = Number(used[0].total);
    if (total) { await connection.rollback(); return { ok: false, status: 409, error: `${total} ${total === 1 ? "product uses" : "products use"} this category. Move ${total === 1 ? "it" : "them"} to another category first.` }; }
    // Products keep their main category; this one is only removed from their extra categories.
    await updateExtraCategories(connection, rows[0].name, null);
    await connection.execute("DELETE FROM kalacar_categories WHERE id=?", [id]);
    await connection.commit();
    return { ok: true, id };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

export async function setCategoryImage(id: number, image: string) {
  const db = await addressDb();
  await db.execute("UPDATE kalacar_categories SET image=? WHERE id=?", [image || null, id]);
}
