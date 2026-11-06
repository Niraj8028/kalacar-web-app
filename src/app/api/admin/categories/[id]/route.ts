import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { deleteCategory, parseCategoryName, renameCategory, setCategoryImage } from "@/lib/categories";
import { safeImage } from "@/lib/site-content";
import { signalled } from "@/lib/realtime";

type Context = { params: Promise<{ id: string }> };
const readId = async ({ params }: Context) => { const id = Number((await params).id); return Number.isSafeInteger(id) && id > 0 ? id : null; };

async function handlePATCH(request: Request, context: Context) {
  const denied = await requireOwner();
  if (denied) return denied;
  const id = await readId(context);
  if (!id) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  const body = await request.json().catch(() => null) as { name?: unknown; image?: unknown } | null;
  if (body?.image !== undefined) {
    try { await setCategoryImage(id, safeImage(body.image)); return NextResponse.json({ success: true }); }
    catch { return NextResponse.json({ error: "Could not save the photo." }, { status: 503 }); }
  }
  const parsed = parseCategoryName(body?.name);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const result = await renameCategory(id, parsed.value);
    return result.ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (error) { console.error("Category rename failed:", error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: "Could not save the category." }, { status: 503 }); }
}

async function handleDELETE(_request: Request, context: Context) {
  const denied = await requireOwner();
  if (denied) return denied;
  const id = await readId(context);
  if (!id) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  try {
    const result = await deleteCategory(id);
    return result.ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (error) { console.error("Category delete failed:", error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: "Could not delete the category." }, { status: 503 }); }
}

export const PATCH = signalled(["products"], handlePATCH);

export const DELETE = signalled(["products"], handleDELETE);
