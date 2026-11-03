import { NextResponse } from "next/server";
import { getAdminOrderDetails, updateOrderFulfillment } from "@/lib/catalogue-db";

const allowed = new Set(["processing", "dispatched", "completed"]);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Owner authentication is not configured." }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  try {
    const order = await getAdminOrderDetails(id);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json({ order }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Order details unavailable:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Order details are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Owner authentication is not configured." }, { status: 403 });
  const body = await request.json().catch(() => null) as { fulfillmentStatus?: unknown } | null;
  if (typeof body?.fulfillmentStatus !== "string" || !allowed.has(body.fulfillmentStatus)) {
    return NextResponse.json({ error: "Choose packing, dispatched, or delivered." }, { status: 400 });
  }
  const { id } = await params;
  try {
    const updated = await updateOrderFulfillment(id, body.fulfillmentStatus as "processing" | "dispatched" | "completed");
    if (!updated) return NextResponse.json({ error: "Only paid orders can be updated, or the order was not found." }, { status: 409 });
    return NextResponse.json({ success: true, fulfillmentStatus: body.fulfillmentStatus }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Order fulfillment update failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Order status is temporarily unavailable." }, { status: 503 });
  }
}
