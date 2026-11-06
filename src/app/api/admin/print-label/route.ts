import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { DEFAULT_LABEL, LABEL_VARIABLES, getLabelTemplate, parseLabelTemplate, saveLabelTemplate } from "@/lib/print-label";
import { signalled } from "@/lib/realtime";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  try { return NextResponse.json({ template: await getLabelTemplate(), defaults: DEFAULT_LABEL, variables: LABEL_VARIABLES }, { headers: noStore }); }
  catch (error) { console.error("Print label unavailable:", error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: "The print label template is temporarily unavailable." }, { status: 503, headers: noStore }); }
}

async function handlePATCH(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;
  const parsed = parseLabelTemplate((await request.json().catch(() => null) as { template?: unknown } | null)?.template);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try { await saveLabelTemplate(parsed.value); return NextResponse.json({ template: parsed.value }, { headers: noStore }); }
  catch (error) { console.error("Print label save failed:", error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: "Could not save the template." }, { status: 503 }); }
}

export const PATCH = signalled(["settings"], handlePATCH);
