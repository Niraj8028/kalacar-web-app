import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { listCustomers } from "@/lib/customers";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  try { return NextResponse.json({ customers: await listCustomers() }, { headers: noStore }); }
  catch (error) {
    console.error("Customers unavailable:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Customers are temporarily unavailable." }, { status: 503, headers: noStore });
  }
}
