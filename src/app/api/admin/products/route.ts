import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { addressDb, listProducts } from "@/lib/catalogue-db";
import { saveColours } from "@/lib/colours";
import { findCategoryName } from "@/lib/categories";
import { InvalidImageError, parseProductForm, removeFiles, savePhotos } from "@/lib/product-form";
import { signalled } from "@/lib/realtime";

const noStore = { "Cache-Control": "no-store" };

/** Dashboard catalogue: every product with all colours, including hidden ones. */
export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  try { return NextResponse.json({ products: await listProducts({ includeHidden: true }) }, { headers: noStore }); }
  catch (error) {
    console.error("Admin catalogue unavailable:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Catalogue is temporarily unavailable." }, { status: 503, headers: noStore });
  }
}

async function handlePOST(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;
  let saved: { paths: string[] } = { paths: [] };
  try {
    const parsed = parseProductForm(await request.formData());
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const form = parsed.value;
    if (form.colours.some(colour => colour.gallery.some(photo => photo.kind === "existing"))) return NextResponse.json({ error: "Upload photos for each colour of a new product." }, { status: 400 });
    const id = form.name.normalize("NFKD").toLowerCase().replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 54) || `murti-${crypto.randomUUID().slice(0, 8)}`;
    const category = await findCategoryName(form.deity);
    if (!category) return NextResponse.json({ error: "Choose a category from the list. You can add categories in Settings." }, { status: 400 });
    form.deity = category;
    const photos = await savePhotos(id, form.files); saved = photos;
    const first = form.colours.find(colour => colour.active) ?? form.colours[0];
    const firstGallery = first.gallery.map(photo => photo.kind === "upload" ? photos.urls[photo.uploadIndex] : photo.src);
    const db = await addressDb();
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        "INSERT INTO kalacar_products (id,name,deity,badge,tagline,image,gallery,image_alt,placement,accordions,specs,highlights,price,original_price,stock) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [id, form.name, form.deity, form.badge || null, form.tagline || null, firstGallery[0], JSON.stringify(firstGallery), `${form.name} product photo`, form.placement, JSON.stringify(form.accordions), JSON.stringify(form.specs), JSON.stringify(form.highlights), first.price, first.originalPrice, 0]);
      await connection.execute("UPDATE kalacar_products SET description=?,bundle_ids=? WHERE id=?", [form.description || null, JSON.stringify(form.bundleIds.filter(other => other !== id)), id]);
      const result = await saveColours(connection, id, form.colours, photos.urls, new Set());
      if (result.status !== "ok") { await connection.rollback(); await removeFiles(photos.paths); return NextResponse.json({ error: result.status === "invalid" ? result.error : "Could not save the colours." }, { status: 400 }); }
      await connection.commit();
      return NextResponse.json({ product: { id, name: form.name, colours: result.colours } }, { status: 201 });
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  } catch (error) {
    await removeFiles(saved.paths);
    if (error instanceof InvalidImageError) return NextResponse.json({ error: "One of the files isn't a real JPG, PNG, WebP or AVIF image. Choose a different photo." }, { status: 400 });
    if (error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY") return NextResponse.json({ error: "A product with that name already exists. Choose a different product name." }, { status: 409 });
    console.error("Product creation failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not create the product in the Kalacar catalogue." }, { status: 503 });
  }
}

export const POST = signalled(["products"], handlePOST);
