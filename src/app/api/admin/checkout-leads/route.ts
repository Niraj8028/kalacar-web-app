import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { listLeads } from "@/lib/checkout-leads";

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  try { return NextResponse.json(await listLeads(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Checkouts are unavailable right now." }, { status: 503 }); }
}
