import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { createProduct } from "@/lib/catalogue-db";
import { parseProductAccordions } from "@/lib/product-accordions";

const imageTypes: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif" };

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Owner authentication is not configured." }, { status: 403 });
  const denied = await requireOwner();
  if (denied) return denied;
  const savedFiles: string[] = [];
  try {
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    const deity = String(form.get("deity") ?? "").trim();
    const placement = String(form.get("placement") ?? "").trim();
    const price = Number(form.get("price"));
    const stock = Number(form.get("stock"));
    const accordions = parseProductAccordions(form.get("accordions") ?? "[]");
    const files = form.getAll("images").filter((entry): entry is File => entry instanceof File);
    if (name.length < 2 || name.length > 160 || deity.length < 2 || deity.length > 80) return NextResponse.json({ error: "Enter a product name and deity (2–160 characters)." }, { status: 400 });
    if (placement.length > 255) return NextResponse.json({ error: "Placement must be 255 characters or fewer." }, { status: 400 });
    if (!accordions) return NextResponse.json({ error: "Check each product detail section (up to 12; title up to 80 and content up to 3,000 characters)." }, { status: 400 });
    if (!Number.isSafeInteger(price) || price < 1 || price > 1000000 || !Number.isSafeInteger(stock) || stock < 0 || stock > 1000000) return NextResponse.json({ error: "Enter a valid price and non-negative whole stock quantity." }, { status: 400 });
    if (files.length < 1 || files.length > 5) return NextResponse.json({ error: "Choose between 1 and 5 product images." }, { status: 400 });
    if (files.some(file => !imageTypes[file.type] || file.size > 5 * 1024 * 1024) || files.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) return NextResponse.json({ error: "Use JPG, PNG, WebP, or AVIF images (up to 5 MB each, 20 MB total)." }, { status: 400 });
    const id = name.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 54) || `murti-${randomUUID().slice(0, 8)}`;
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
    await createProduct({ id, name, deity, image: gallery[0], gallery, placement, accordions, price, originalPrice: price, stock });
    return NextResponse.json({ product: { id, name, deity, image: gallery[0], gallery, placement, accordions, price, originalPrice: price, stock } }, { status: 201 });
  } catch (error) {
    await Promise.all(savedFiles.map(file => unlink(file).catch(() => undefined)));
    if (error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY") return NextResponse.json({ error: "A product with that name already exists. Choose a different product name." }, { status: 409 });
    console.error("Product creation failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not create the product in the Kalacar catalogue." }, { status: 503 });
  }
}
