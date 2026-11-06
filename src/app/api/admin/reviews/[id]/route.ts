import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { signalled } from "@/lib/realtime";
import { deleteReview, parseReview, updateReview } from "@/lib/site-content";

type Context = { params: Promise<{ id: string }> };
const readId = async ({ params }: Context) => { const id = Number((await params).id); return Number.isSafeInteger(id) && id > 0 ? id : null; };

async function handlePATCH(request: Request, context: Context) {
  const denied = await requireOwner();
  if (denied) return denied;
  const id = await readId(context);
  if (!id) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  const parsed = parseReview(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try { await updateReview(id, parsed.value); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Could not save the review." }, { status: 503 }); }
}
async function handleDELETE(_request: Request, context: Context) {
  const denied = await requireOwner();
  if (denied) return denied;
  const id = await readId(context);
  if (!id) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  try { await deleteReview(id); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Could not delete the review." }, { status: 503 }); }
}
export const PATCH = signalled(["store"], handlePATCH);
export const DELETE = signalled(["store"], handleDELETE);
