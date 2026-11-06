import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { defaultPage, getPage, parsePage, resetPage, savePage } from "@/lib/pages";
import { signalled } from "@/lib/realtime";

type Context = { params: Promise<{ slug: string }> };

async function handlePATCH(request: Request, { params }: Context) {
  const denied = await requireOwner();
  if (denied) return denied;
  const { slug } = await params;
  if (!defaultPage(slug)) return NextResponse.json({ error: "Page not found." }, { status: 404 });
  const parsed = parsePage(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try { await savePage(slug, parsed.value); return NextResponse.json({ page: await getPage(slug) }); }
  catch { return NextResponse.json({ error: "Could not save the page." }, { status: 503 }); }
}
/** Goes back to the page's starting text. */
async function handleDELETE(_request: Request, { params }: Context) {
  const denied = await requireOwner();
  if (denied) return denied;
  const { slug } = await params;
  if (!defaultPage(slug)) return NextResponse.json({ error: "Page not found." }, { status: 404 });
  try { await resetPage(slug); return NextResponse.json({ page: defaultPage(slug) }); }
  catch { return NextResponse.json({ error: "Could not reset the page." }, { status: 503 }); }
}
export const PATCH = signalled(["store"], handlePATCH);
export const DELETE = signalled(["store"], handleDELETE);
