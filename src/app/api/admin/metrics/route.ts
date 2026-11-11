import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { getAdminMetrics } from "@/lib/catalogue-db";
import { getPaymentStatus } from "@/lib/payment-status";

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  try {
    return NextResponse.json({ ...await getAdminMetrics(), paymentMode: getPaymentStatus().mode }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Owner dashboard metrics unavailable:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Dashboard metrics are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
