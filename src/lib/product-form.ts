import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { readVerifiedImage } from "@/lib/image-signature";
import { parseProductAccordions } from "@/lib/product-accordions";
import { parseColours } from "@/lib/colours";
import type { ColourInput } from "@/lib/colours";
import type { ProductAccordion } from "@/data/catalogue";

/** Shared parsing for the dashboard's create/edit product form (product details + colours + photos). */
export type ProductForm = { name: string; deity: string; badge: string; tagline: string; placement: string; accordions: ProductAccordion[]; colours: ColourInput[]; files: File[] };

export class InvalidImageError extends Error {}

export function parseProductForm(form: FormData): { error: string } | { value: ProductForm } {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const name = text("name"), deity = text("deity"), badge = text("badge"), tagline = text("tagline"), placement = text("placement");
  if (name.length < 2 || name.length > 160 || deity.length < 2 || deity.length > 80) return { error: "Enter a product name and deity (2–160 characters)." };
  if (badge.length > 40) return { error: "Keep the badge to 40 characters (e.g. Flagship)." };
  if (tagline.length > 120) return { error: "Keep the tagline to 120 characters." };
  if (placement.length > 255) return { error: "Description must be 255 characters or fewer." };
  const accordions = parseProductAccordions(form.get("accordions") ?? "[]");
  if (!accordions) return { error: "Check each product detail section (up to 12; title up to 80 and content up to 3,000 characters)." };
  const files = form.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length > 20) return { error: "Upload up to 20 photos at a time." };
  if (files.some(file => file.size > 5 * 1024 * 1024)) return { error: "Each photo can be up to 5 MB." };
  const colours = parseColours(form.get("colours"), files.length);
  if ("error" in colours) return { error: colours.error };
  return { value: { name, deity, badge, tagline, placement, accordions, colours: colours.value, files } };
}

/** Writes verified photos to /public/uploads; returns their URLs and disk paths (for cleanup on failure). */
export async function savePhotos(productId: string, files: File[]) {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const urls: string[] = []; const paths: string[] = [];
  try {
    for (const file of files) {
      const verified = await readVerifiedImage(file);
      if (!verified) throw new InvalidImageError();
      const fileName = `${productId}-${randomUUID()}${verified.extension}`;
      const diskPath = path.join(uploadDir, fileName);
      await writeFile(diskPath, verified.bytes, { flag: "wx" });
      paths.push(diskPath); urls.push(`/uploads/${fileName}`);
    }
  } catch (error) { await removeFiles(paths); throw error; }
  return { urls, paths };
}

export const removeFiles = (paths: string[]) => Promise.all(paths.map(file => unlink(file).catch(() => undefined)));
