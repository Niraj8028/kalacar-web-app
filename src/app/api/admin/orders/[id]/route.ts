import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { cancelUnpaidOrder, getAdminOrderDetails, recordOrderRefund, setOrderTrackingNote, updateOrderFulfillment } from "@/lib/catalogue-db";

const allowed = new Set(["processing", "dispatched", "completed"]);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireOwner();
  if (denied) return denied;
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

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/**
 * PATCH body, one of:
 *  { fulfillmentStatus: "processing" | "dispatched" | "completed" }
 *  { action: "cancel", reason? }                       — unpaid orders only; releases stock
 *  { action: "refund", amount, reason, reference?, restock? } — records a refund issued in Razorpay
 *  { action: "tracking", note }                        — courier/tracking note shown to the customer
 * There is deliberately no way to mark an order paid from the dashboard.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireOwner();
  if (denied) return denied;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    if (body.action === "cancel") {
      const result = await cancelUnpaidOrder(id, text(body.reason, 300));
      return result.ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: result.error }, { status: result.status });
    }
    if (body.action === "refund") {
      const amount = Number(body.amount);
      const reason = text(body.reason, 300);
      if (!reason) return NextResponse.json({ error: "Add a short reason for the refund." }, { status: 400 });
      const result = await recordOrderRefund(id, { amount, reason, reference: text(body.reference, 64), restock: body.restock === true });
      return result.ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: result.error }, { status: result.status });
    }
    if (body.action === "tracking") {
      const updated = await setOrderTrackingNote(id, text(body.note, 300));
      return updated ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Tracking notes can only be added to paid orders." }, { status: 409 });
    }
    if (typeof body.fulfillmentStatus !== "string" || !allowed.has(body.fulfillmentStatus)) {
      return NextResponse.json({ error: "Choose packing, dispatched, or delivered." }, { status: 400 });
    }
    const updated = await updateOrderFulfillment(id, body.fulfillmentStatus as "processing" | "dispatched" | "completed");
    if (!updated) return NextResponse.json({ error: "Only paid orders can be updated, or the order was not found." }, { status: 409 });
    return NextResponse.json({ success: true, fulfillmentStatus: body.fulfillmentStatus }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Order update failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Order status is temporarily unavailable." }, { status: 503 });
  }
}
