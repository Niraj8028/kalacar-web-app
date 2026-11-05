import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { createCategory, listCategories, parseCategoryName } from "@/lib/categories";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  try { return NextResponse.json({ categories: await listCategories() }, { headers: noStore }); }
  catch (error) { console.error("Categories unavailable:", error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: "Categories are temporarily unavailable." }, { status: 503, headers: noStore }); }
}

export async function POST(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;
  const parsed = parseCategoryName((await request.json().catch(() => null) as { name?: unknown } | null)?.name);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const result = await createCategory(parsed.value);
    return result.ok ? NextResponse.json({ id: result.id }, { status: 201 }) : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (error) { console.error("Category create failed:", error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: "Could not save the category." }, { status: 503 }); }
}
