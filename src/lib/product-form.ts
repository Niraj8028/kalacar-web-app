import { randomUUID } from "node:crypto";
import { deletePhotos, savePhoto } from "@/lib/catalogue-db";
import { readVerifiedImage } from "@/lib/image-signature";
import { parseProductAccordions } from "@/lib/product-accordions";
import { parseColours } from "@/lib/colours";
import type { ColourInput } from "@/lib/colours";
import type { ProductAccordion } from "@/data/catalogue";

/** Shared parsing for the dashboard's create/edit product form (product details + colours + photos). */
export type ProductForm = { name: string; deity: string; badge: string; tagline: string; placement: string; description: string; bundleIds: string[]; accordions: ProductAccordion[]; specs: Array<{ label: string; value: string }>; highlights: string[]; colours: ColourInput[]; files: File[] };

/** Specification cards: up to 8 label/value pairs (owner-entered facts only). */
function parseSpecs(raw: FormDataEntryValue | null): { error: string } | { value: Array<{ label: string; value: string }> } {
  let list: unknown = [];
  try { list = raw ? JSON.parse(String(raw)) : []; } catch { return { error: "The specifications could not be read." }; }
  if (!Array.isArray(list) || list.length > 8) return { error: "Add up to 8 specifications." };
  const out: Array<{ label: string; value: string }> = [];
  for (const item of list) {
    const label = typeof item?.label === "string" ? item.label.trim() : "", value = typeof item?.value === "string" ? item.value.trim() : "";
    if (!label && !value) continue;
    if (!label || label.length > 30) return { error: "Each specification needs a label of up to 30 characters (e.g. Height)." };
    if (!value || value.length > 80) return { error: `“${label}” needs a value of up to 80 characters.` };
    out.push({ label, value });
  }
  return { value: out };
}
/** Highlights: up to 6 short lines. */
function parseHighlights(raw: FormDataEntryValue | null): { error: string } | { value: string[] } {
  let list: unknown = [];
  try { list = raw ? JSON.parse(String(raw)) : []; } catch { return { error: "The highlights could not be read." }; }
  if (!Array.isArray(list)) return { error: "The highlights could not be read." };
  const out = list.map(item => typeof item === "string" ? item.trim() : "").filter(Boolean);
  if (out.length > 6) return { error: "Add up to 6 highlights." };
  if (out.some(item => item.length > 80)) return { error: "Keep each highlight to 80 characters." };
  return { value: out };
}

export class InvalidImageError extends Error {}

export function parseProductForm(form: FormData): { error: string } | { value: ProductForm } {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const name = text("name"), deity = text("deity"), badge = text("badge"), tagline = text("tagline"), placement = text("placement");
  if (name.length < 2 || name.length > 160 || deity.length < 2 || deity.length > 80) return { error: "Enter a product name and choose a category." };
  if (badge.length > 40) return { error: "Keep the badge to 40 characters (e.g. Flagship)." };
  if (tagline.length > 120) return { error: "Keep the tagline to 120 characters." };
  if (placement.length > 255) return { error: "Description must be 255 characters or fewer." };
  const description = text("description");
  if (description.length > 4000) return { error: "Keep the description to 4,000 characters." };
  let bundleIds: string[] = [];
  try {
    const list = JSON.parse(String(form.get("bundleIds") ?? "[]")) as unknown;
    if (Array.isArray(list)) bundleIds = [...new Set(list.filter((id): id is string => typeof id === "string" && /^[a-z0-9-]{1,64}$/.test(id)))].slice(0, 2);
  } catch { return { error: "Choose valid bundle products." }; }
  const accordions = parseProductAccordions(form.get("accordions") ?? "[]");
  if (!accordions) return { error: "Check each product detail section (up to 12; title up to 80 and content up to 3,000 characters)." };
  const specs = parseSpecs(form.get("specs"));
  if ("error" in specs) return { error: specs.error };
  const highlights = parseHighlights(form.get("highlights"));
  if ("error" in highlights) return { error: highlights.error };
  const files = form.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length > 20) return { error: "Upload up to 20 photos at a time." };
  if (files.some(file => file.size > 5 * 1024 * 1024)) return { error: "Each photo can be up to 5 MB." };
  const colours = parseColours(form.get("colours"), files.length);
  if ("error" in colours) return { error: colours.error };
  return { value: { name, deity, badge, tagline, placement, description, bundleIds, accordions, specs: specs.value, highlights: highlights.value, colours: colours.value, files } };
}

const PHOTO_TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif" };

/** Saves verified photos in the database; returns their URLs and names (for cleanup on failure). */
export async function savePhotos(productId: string, files: File[]) {
  const urls: string[] = []; const paths: string[] = [];
  try {
    for (const file of files) {
      const verified = await readVerifiedImage(file);
      if (!verified) throw new InvalidImageError();
      const fileName = `${productId}-${randomUUID()}${verified.extension}`;
      await savePhoto(fileName, PHOTO_TYPES[verified.extension], Buffer.from(verified.bytes));
      paths.push(fileName); urls.push(`/uploads/${fileName}`);
    }
  } catch (error) { await removeFiles(paths); throw error; }
  return { urls, paths };
}

export const removeFiles = (fileNames: string[]) => deletePhotos(fileNames).catch(() => undefined);
