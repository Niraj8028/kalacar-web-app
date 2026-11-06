import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { deleteInquiry, setInquiryHandled } from "@/lib/pages";
import { signalled } from "@/lib/realtime";

type Context = { params: Promise<{ id: string }> };
const readId = async ({ params }: Context) => { const id = Number((await params).id); return Number.isSafeInteger(id) && id > 0 ? id : null; };

async function handlePATCH(request: Request, context: Context) {
  const denied = await requireOwner();
  if (denied) return denied;
  const id = await readId(context);
  const body = await request.json().catch(() => null) as { handled?: unknown } | null;
  if (!id || typeof body?.handled !== "boolean") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try { await setInquiryHandled(id, body.handled); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Could not save." }, { status: 503 }); }
}
async function handleDELETE(_request: Request, context: Context) {
  const denied = await requireOwner();
  if (denied) return denied;
  const id = await readId(context);
  if (!id) return NextResponse.json({ error: "Message not found." }, { status: 404 });
  try { await deleteInquiry(id); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Could not delete." }, { status: 503 }); }
}
export const PATCH = signalled(["inquiries"], handlePATCH);
export const DELETE = signalled(["inquiries"], handleDELETE);
