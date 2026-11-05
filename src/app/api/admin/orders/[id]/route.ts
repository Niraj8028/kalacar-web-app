import { NextResponse } from "next/server";
import { isCourier, isTrackingId, normalizeTrackingId } from "@/lib/couriers";
import { requireOwner } from "@/lib/customer-auth";
import { cancelUnpaidOrder, getAdminOrderDetails, recordOrderRefund, setOrderTracking, updateOrderFulfillment, type FulfillmentStatus } from "@/lib/catalogue-db";

const allowed = new Set(["unfulfilled", "processing", "dispatched", "completed"]);

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
 *  { fulfillmentStatus, expected } — either: "unfulfilled" | "processing" | "dispatched" | "completed"
 *  { action: "cancel", reason? }                       — unpaid orders only; releases stock
 *  { action: "refund", amount, reason, reference?, restock? } — records a refund issued in Razorpay
 *  { action: "tracking", courier, trackingId, note }   — shown to the customer; courier and ID go together
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
      const trackingId = normalizeTrackingId(body.trackingId);
      const courier = body.courier === "" || body.courier === undefined ? null : body.courier;
      if (courier !== null && !isCourier(courier)) return NextResponse.json({ error: "Choose Trackon or India Post." }, { status: 400 });
      if (Boolean(courier) !== Boolean(trackingId)) return NextResponse.json({ error: "Choose the courier and enter its tracking ID together." }, { status: 400 });
      if (trackingId && !isTrackingId(trackingId)) return NextResponse.json({ error: "Tracking IDs use 6–30 letters, numbers or dashes." }, { status: 400 });
      const updated = await setOrderTracking(id, { note: text(body.note, 300), courier, trackingId: trackingId || null });
      return updated ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Tracking can only be added to paid orders." }, { status: 409 });
    }
    if (typeof body.fulfillmentStatus !== "string" || !allowed.has(body.fulfillmentStatus) || typeof body.expected !== "string" || !allowed.has(body.expected)) {
      return NextResponse.json({ error: "Choose a valid delivery status." }, { status: 400 });
    }
    const updated = await updateOrderFulfillment(id, body.fulfillmentStatus as FulfillmentStatus, body.expected as FulfillmentStatus);
    if (!updated) return NextResponse.json({ error: "Not saved: this order changed or isn't paid. Check its current status and try again." }, { status: 409 });
    return NextResponse.json({ success: true, fulfillmentStatus: body.fulfillmentStatus }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Order update failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Order status is temporarily unavailable." }, { status: 503 });
  }
}
