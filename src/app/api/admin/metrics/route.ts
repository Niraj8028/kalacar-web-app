import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { getAdminMetrics } from "@/lib/catalogue-db";

export async function GET() {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Owner authentication is not configured." }, { status: 403 });
  const denied = await requireOwner();
  if (denied) return denied;
  try {
    const keyId = process.env.RAZORPAY_KEY_ID ?? "";
    const paymentMode = keyId.startsWith("rzp_test_") ? "test" : keyId.startsWith("rzp_live_") ? "live" : "unconfigured";
    return NextResponse.json({ ...await getAdminMetrics(), paymentMode }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Owner dashboard metrics unavailable:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Dashboard metrics are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
