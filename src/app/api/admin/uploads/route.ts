import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { InvalidImageError, savePhotos } from "@/lib/product-form";

/** One photo for the home page, a category, or a review. Checked to be a real image and stored like product photos. */
export async function POST(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;
  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Choose a photo." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Each photo can be up to 5 MB." }, { status: 400 });
  try { const { urls } = await savePhotos("site", [file]); return NextResponse.json({ url: urls[0] }); }
  catch (error) {
    if (error instanceof InvalidImageError) return NextResponse.json({ error: "That file isn't a real JPG, PNG, WebP or AVIF image." }, { status: 400 });
    return NextResponse.json({ error: "Could not save the photo." }, { status: 503 });
  }
}
