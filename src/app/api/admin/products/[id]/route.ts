import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { addressDb } from "@/lib/catalogue-db";
import { saveColours, updateColourQuick } from "@/lib/colours";
import { InvalidImageError, parseProductForm, removeFiles, savePhotos } from "@/lib/product-form";

/**
 * Edit details: product fields (name, deity, badge, tagline, description, detail sections) and the
 * full list of colours with their photos, prices and stock. Quick price/stock edits for one colour
 * go to /api/admin/products/[id]/variants/[variantId].
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Owner authentication is not configured." }, { status: 403 });
  const denied = await requireOwner();
  if (denied) return denied;
  const { id } = await params;
  if (!/^[a-z0-9-]{1,64}$/.test(id)) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  if (!(request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    // Quick price/stock edit on a product with exactly one colour applies to that colour.
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
    const db = await addressDb();
    const [variants] = await db.execute("SELECT id FROM kalacar_product_variants WHERE product_id=?", [id]) as unknown as [Array<{ id: string }>];
    if (!variants.length) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    if (variants.length > 1) return NextResponse.json({ error: "This product has several colours. Change price and stock per colour." }, { status: 409 });
    const values: { price?: number; stock?: number } = {}; const expected: { price?: number; stock?: number } = {};
    for (const key of ["price", "stock"] as const) {
      const value = body[key];
      if (value !== undefined) {
        const min = key === "price" ? 1 : 0;
        if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > 1_000_000) return NextResponse.json({ error: key === "price" ? "Price must be a whole number of rupees from ₹1 to ₹10,00,000." : "Stock must be a whole number from 0 to 10,00,000." }, { status: 400 });
        values[key] = value as number;
      }
      const exp = body[key === "price" ? "expectedPrice" : "expectedStock"];
      if (exp !== undefined) { if (!Number.isSafeInteger(exp) || (exp as number) < 0) return NextResponse.json({ error: "Invalid expected values." }, { status: 400 }); expected[key] = exp as number; }
    }
    if (!Object.keys(values).length) return NextResponse.json({ error: "Provide a price or stock to update." }, { status: 400 });
    const result = await updateColourQuick(id, variants[0].id, values, expected);
    if (result.status === "not_found") return NextResponse.json({ error: "Product not found." }, { status: 404 });
    if (result.status === "conflict") return NextResponse.json({ error: "This product changed while you were editing (for example, an order came in). Nothing was saved.", conflict: true, current: result.current }, { status: 409, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ ok: true, id, ...values }, { headers: { "Cache-Control": "no-store" } });
  }
  let saved: { paths: string[] } = { paths: [] };
  try {
    const parsed = parseProductForm(await request.formData());
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const form = parsed.value;
    const photos = await savePhotos(id, form.files); saved = photos;
    const db = await addressDb();
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute("SELECT image, gallery FROM kalacar_products WHERE id=? FOR UPDATE", [id]) as unknown as [Array<{ image: string; gallery: string | null }>];
      if (!rows.length) { await connection.rollback(); await removeFiles(photos.paths); return NextResponse.json({ error: "Product not found." }, { status: 404 }); }
      // Photos already on this product (old product gallery + every colour's gallery) may be reused.
      const allowed = new Set<string>([rows[0].image, ...(rows[0].gallery ? JSON.parse(rows[0].gallery) as string[] : [])]);
      await connection.execute("UPDATE kalacar_products SET name=?,deity=?,badge=?,tagline=?,placement=?,accordions=?,image_alt=? WHERE id=?",
        [form.name, form.deity, form.badge || null, form.tagline || null, form.placement, JSON.stringify(form.accordions), `${form.name} product photo`, id]);
      const result = await saveColours(connection, id, form.colours, photos.urls, allowed);
      if (result.status !== "ok") {
        await connection.rollback(); await removeFiles(photos.paths);
        if (result.status === "conflict") return NextResponse.json({ error: `“${result.colour}” changed while this form was open (for example, an order came in). Nothing was saved.`, conflict: true, colour: result.colour, current: result.current }, { status: 409 });
        if (result.status === "not_found") return NextResponse.json({ error: "Product not found." }, { status: 404 });
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      await connection.commit();
      return NextResponse.json({ ok: true, id, colours: result.colours }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  } catch (error) {
    await removeFiles(saved.paths);
    if (error instanceof InvalidImageError) return NextResponse.json({ error: "One of the files isn't a real JPG, PNG, WebP or AVIF image. Choose a different photo." }, { status: 400 });
    console.error("Product update unavailable:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Product update could not be saved." }, { status: 503 });
  }
}

/** Deletes a product and its colours. Refused while an open order still needs this product. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Owner authentication is not configured." }, { status: 403 });
  const denied = await requireOwner();
  if (denied) return denied;
  const { id } = await params;
  if (!/^[a-z0-9-]{1,64}$/.test(id)) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  try {
    const db = await addressDb();
    const [open] = await db.execute(`SELECT COUNT(*) n FROM kalacar_order_items i JOIN kalacar_orders o ON o.id=i.order_id
      WHERE i.product_id=? AND (o.status IN ('payment_pending','payment_failed','paid_after_cancel') OR (o.status='paid' AND o.fulfillment_status<>'completed'))`, [id]) as unknown as [Array<{ n: number }>];
    if (Number(open[0].n) > 0) return NextResponse.json({ error: `This product is in ${open[0].n} open order(s). Finish or cancel those orders first, or hide its colours instead.` }, { status: 409 });
    const [result] = await db.execute("DELETE FROM kalacar_products WHERE id=?", [id]) as unknown as [{ affectedRows: number }];
    if (!result.affectedRows) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Product delete failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not delete the product right now." }, { status: 503 });
  }
}
