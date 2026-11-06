import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { listInquiries } from "@/lib/pages";

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  try { return NextResponse.json({ inquiries: await listInquiries() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Messages are unavailable right now." }, { status: 503 }); }
}
