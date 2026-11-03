import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getProductGallery, updateProduct } from "@/lib/catalogue-db";
import { parseProductAccordions } from "@/lib/product-accordions";

const imageTypes: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif" };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Owner authentication is not configured." }, { status: 403 });
  const { id } = await params;
  const savedFiles: string[] = [];
  try {
    const contentType = request.headers.get("content-type") || "";
    let update: Parameters<typeof updateProduct>[1] = {};
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const name = String(form.get("name") ?? "").trim();
      const deity = String(form.get("deity") ?? "").trim();
      const placement = String(form.get("placement") ?? "").trim();
      const price = Number(form.get("price"));
      const stock = Number(form.get("stock"));
      const accordions = parseProductAccordions(form.get("accordions"));
      const files = form.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);
      if (name.length < 2 || name.length > 160 || deity.length < 2 || deity.length > 80) return NextResponse.json({ error: "Enter a product name and deity (2–160 characters)." }, { status: 400 });
      if (placement.length > 255) return NextResponse.json({ error: "Description must be 255 characters or fewer." }, { status: 400 });
      if (!Number.isSafeInteger(price) || price < 1 || price > 1000000 || !Number.isSafeInteger(stock) || stock < 0 || stock > 1000000) return NextResponse.json({ error: "Enter a valid price and non-negative whole stock quantity." }, { status: 400 });
      if (!accordions) return NextResponse.json({ error: "Check each product detail section (up to 12; title up to 80 and content up to 3,000 characters)." }, { status: 400 });
      if (files.length > 5) return NextResponse.json({ error: "A product can have no more than 5 images." }, { status: 400 });
      if (files.some(file => !imageTypes[file.type] || file.size > 5 * 1024 * 1024) || files.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) return NextResponse.json({ error: "Use JPG, PNG, WebP, or AVIF images (up to 5 MB each, 20 MB total)." }, { status: 400 });
      update = { name, deity, placement, price, stock, accordions };
      const manifestValue = form.get("galleryManifest");
      if (typeof manifestValue === "string") {
        let rawManifest: unknown;
        try { rawManifest = JSON.parse(manifestValue); } catch { return NextResponse.json({ error: "The product image order is invalid." }, { status: 400 }); }
        if (!Array.isArray(rawManifest) || rawManifest.length < 1 || rawManifest.length > 5) return NextResponse.json({ error: "Keep between 1 and 5 product images." }, { status: 400 });
        const currentGallery = await getProductGallery(id);
        if (!currentGallery) return NextResponse.json({ error: "Product not found." }, { status: 404 });
        const usedFiles = new Set<number>();
        const existingSources = new Set<string>();
        const manifest: Array<{ kind: "existing"; src: string } | { kind: "upload"; uploadIndex: number }> = [];
        for (const item of rawManifest) {
          if (!item || typeof item !== "object") return NextResponse.json({ error: "The product image order is invalid." }, { status: 400 });
          const entry = item as { kind?: unknown; src?: unknown; uploadIndex?: unknown };
          if (entry.kind === "existing" && typeof entry.src === "string" && currentGallery.includes(entry.src) && !existingSources.has(entry.src)) {
            existingSources.add(entry.src); manifest.push({ kind: "existing", src: entry.src });
          } else if (entry.kind === "upload" && Number.isSafeInteger(entry.uploadIndex) && Number(entry.uploadIndex) >= 0 && Number(entry.uploadIndex) < files.length && !usedFiles.has(Number(entry.uploadIndex))) {
            usedFiles.add(Number(entry.uploadIndex)); manifest.push({ kind: "upload", uploadIndex: Number(entry.uploadIndex) });
          } else return NextResponse.json({ error: "The product image order is invalid. Reload the editor and try again." }, { status: 400 });
        }
        if (usedFiles.size !== files.length) return NextResponse.json({ error: "One or more selected replacement images are missing." }, { status: 400 });
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });
        const gallery: string[] = [];
        for (const entry of manifest) {
          if (entry.kind === "existing") { gallery.push(entry.src); continue; }
          const file = files[entry.uploadIndex];
          const fileName = `${id}-${randomUUID()}${imageTypes[file.type]}`;
          const diskPath = path.join(uploadDir, fileName);
          await writeFile(diskPath, Buffer.from(await file.arrayBuffer()), { flag: "wx" });
          savedFiles.push(diskPath);
          gallery.push(`/uploads/${fileName}`);
        }
        update = { ...update, image: gallery[0], gallery };
      } else if (files.length) {
        // Preserve support for clients that send a complete replacement gallery.
        if (files.length > 5) return NextResponse.json({ error: "A product can have no more than 5 images." }, { status: 400 });
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });
        const gallery: string[] = [];
        for (const file of files) {
          const fileName = `${id}-${randomUUID()}${imageTypes[file.type]}`;
          const diskPath = path.join(uploadDir, fileName);
          await writeFile(diskPath, Buffer.from(await file.arrayBuffer()), { flag: "wx" });
          savedFiles.push(diskPath);
          gallery.push(`/uploads/${fileName}`);
        }
        update = { ...update, image: gallery[0], gallery };
      }
    } else {
      let body: unknown;
      try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
      if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid update." }, { status: 400 });
      const values = body as { price?: unknown; stock?: unknown };
      for (const key of ["price", "stock"] as const) {
        const value = values[key];
        if (value === undefined) continue;
        if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 1000000) return NextResponse.json({ error: `${key} must be a whole number between 0 and 1,000,000.` }, { status: 400 });
        update[key] = value as number;
      }
      if (!Object.keys(update).length) return NextResponse.json({ error: "Provide product fields to update." }, { status: 400 });
    }
    const updated = await updateProduct(id, update);
    if (!updated) {
      await Promise.all(savedFiles.map(file => unlink(file).catch(() => undefined)));
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id, ...update }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await Promise.all(savedFiles.map(file => unlink(file).catch(() => undefined)));
    console.error("Product update unavailable:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Product update could not be saved." }, { status: 503 });
  }
}
