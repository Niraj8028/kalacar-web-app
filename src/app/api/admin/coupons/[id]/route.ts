import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { deleteCoupon, parseCoupon, setCouponActive, updateCoupon } from "@/lib/coupons";

const devOnly = () => process.env.NODE_ENV !== "development" ? NextResponse.json({ error: "Owner authentication is not configured." }, { status: 403 }) : null;
const idFrom = async (params: Promise<{ id: string }>) => { const { id } = await params; return /^\d{1,10}$/.test(id) ? Number(id) : null; };

/** Body `{ active }` alone switches a coupon on/off; otherwise the whole coupon is replaced. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = devOnly() ?? await requireOwner();
  if (blocked) return blocked;
  const id = await idFrom(params);
  if (id === null) return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid coupon." }, { status: 400 }); }
  try {
    if (body && typeof body === "object" && Object.keys(body).length === 1 && typeof (body as { active?: unknown }).active === "boolean") {
      return await setCouponActive(id, (body as { active: boolean }).active) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Coupon not found." }, { status: 404 });
    }
    const parsed = parseCoupon(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const result = await updateCoupon(id, parsed.value);
    return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (error) { console.error("Coupon update failed:", error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: "Could not save the coupon. Please try again." }, { status: 503 }); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = devOnly() ?? await requireOwner();
  if (blocked) return blocked;
  const id = await idFrom(params);
  if (id === null) return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
  try {
    const result = await deleteCoupon(id);
    return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (error) { console.error("Coupon delete failed:", error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: "Could not delete the coupon. Please try again." }, { status: 503 }); }
}
