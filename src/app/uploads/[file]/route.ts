import { findPhoto } from "@/lib/catalogue-db";

/** Serves product photos from the database. A name never changes, so browsers may keep them. */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[a-z0-9-]+\.(jpg|png|webp|avif)$/i.test(file)) return new Response("Not found", { status: 404 });
  try {
    const photo = await findPhoto(file);
    if (!photo) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(photo.bytes), { headers: { "Content-Type": photo.contentType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("Photo unavailable:", error instanceof Error ? error.message : "unknown error");
    return new Response("Photo unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
