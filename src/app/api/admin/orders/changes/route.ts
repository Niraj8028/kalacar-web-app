import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { getOrdersStamp } from "@/lib/catalogue-db";
import { expireUnpaidOrders, recheckRecentPayments } from "@/lib/order-reconcile";

/** A small "has anything changed?" answer, so the dashboard only reloads orders when it needs to. */
export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  recheckRecentPayments(); expireUnpaidOrders();
  try { return NextResponse.json({ stamp: await getOrdersStamp() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Orders are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
