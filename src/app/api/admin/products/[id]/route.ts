import { NextResponse } from "next/server";
import { updateProduct } from "@/lib/catalogue-db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Owner authentication is not configured." }, { status: 403 });
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  const values = body as { price?: unknown; stock?: unknown };
  const update: { price?: number; stock?: number } = {};
  for (const key of ["price", "stock"] as const) {
    const value = values[key];
    if (value === undefined) continue;
    if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 1000000) return NextResponse.json({ error: `${key} must be a whole number between 0 and 1,000,000.` }, { status: 400 });
    update[key] = value as number;
  }
  if (!Object.keys(update).length) return NextResponse.json({ error: "Provide price or stock." }, { status: 400 });
  try {
    const updated = await updateProduct(id, update);
    if (!updated) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json({ ok: true, id, ...update }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Inventory update unavailable:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Inventory update could not be saved." }, { status: 503 });
  }
}
