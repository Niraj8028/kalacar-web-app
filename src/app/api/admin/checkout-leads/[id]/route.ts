import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { markLeadContacted } from "@/lib/checkout-leads";

/** Ticks a checkout as contacted (or not), so the owner knows who they've already messaged. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireOwner();
  if (denied) return denied;
  const { id } = await params;
  const body = await request.json().catch(() => null) as { contacted?: unknown } | null;
  if (typeof body?.contacted !== "boolean") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try { return await markLeadContacted(id, body.contacted) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found." }, { status: 404 }); }
  catch { return NextResponse.json({ error: "Couldn't save. Try again." }, { status: 503 }); }
}
