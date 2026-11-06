import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { listPages } from "@/lib/pages";

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  try { return NextResponse.json({ pages: await listPages() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Pages are unavailable right now." }, { status: 503 }); }
}
