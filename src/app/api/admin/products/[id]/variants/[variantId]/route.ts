import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { updateColourQuick } from "@/lib/colours";

/** Products tab quick edit for one colour: { price?, stock?, expectedPrice, expectedStock }. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Owner authentication is not configured." }, { status: 403 });
  const denied = await requireOwner();
  if (denied) return denied;
  const { id, variantId } = await params;
  if (!/^[a-z0-9-]{1,64}$/.test(id) || !/^[a-z0-9-]{1,80}$/.test(variantId)) return NextResponse.json({ error: "Colour not found." }, { status: 404 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
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
  try {
    const result = await updateColourQuick(id, variantId, values, expected);
    if (result.status === "not_found") return NextResponse.json({ error: "Colour not found." }, { status: 404 });
    if (result.status === "conflict") return NextResponse.json({ error: "This colour changed while you were editing (for example, an order came in). Nothing was saved.", conflict: true, current: result.current }, { status: 409, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ ok: true, ...values }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Colour update failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not save this colour." }, { status: 503 });
  }
}
