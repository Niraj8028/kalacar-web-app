import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { createCoupon, listCoupons, parseCoupon } from "@/lib/coupons";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const blocked = await requireOwner();
  if (blocked) return blocked;
  try { return NextResponse.json({ coupons: await listCoupons() }, { headers: noStore }); }
  catch (error) { console.error("Coupons unavailable:", error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: "Coupons are temporarily unavailable." }, { status: 503, headers: noStore }); }
}

export async function POST(request: Request) {
  const blocked = await requireOwner();
  if (blocked) return blocked;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid coupon." }, { status: 400 }); }
  const parsed = parseCoupon(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const result = await createCoupon(parsed.value);
    return result.ok ? NextResponse.json({ id: result.id }, { status: 201 }) : NextResponse.json({ error: result.error }, { status: 409 });
  } catch (error) { console.error("Coupon create failed:", error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: "Could not save the coupon. Please try again." }, { status: 503 }); }
}
