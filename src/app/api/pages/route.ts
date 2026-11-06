import { NextResponse, connection } from "next/server";
import { listPages } from "@/lib/pages";

/** Footer links. */
export async function GET() {
  await connection();
  try { return NextResponse.json({ pages: (await listPages()).filter(page => page.published && page.inFooter).map(({ slug, title }) => ({ slug, title })) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
