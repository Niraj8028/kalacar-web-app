import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { getPaymentStatus } from "@/lib/payment-status";

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  return NextResponse.json(getPaymentStatus(), { headers: { "Cache-Control": "no-store" } });
}
