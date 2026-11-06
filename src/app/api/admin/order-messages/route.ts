import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { DEFAULT_TEMPLATES, MESSAGE_VARIABLES, getMessageTemplates, isMessageStatus, parseMessageTemplate, saveMessageTemplate } from "@/lib/order-messages";
import { signalled } from "@/lib/realtime";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  try { return NextResponse.json({ templates: await getMessageTemplates(), defaults: DEFAULT_TEMPLATES, variables: MESSAGE_VARIABLES }, { headers: noStore }); }
  catch (error) { console.error("Message templates unavailable:", error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: "Message templates are temporarily unavailable." }, { status: 503, headers: noStore }); }
}

async function handlePATCH(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;
  const body = await request.json().catch(() => null) as { status?: unknown; template?: unknown } | null;
  if (!isMessageStatus(body?.status)) return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
  const parsed = parseMessageTemplate(body.template);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try { await saveMessageTemplate(body.status, parsed.value); return NextResponse.json({ template: parsed.value }, { headers: noStore }); }
  catch (error) { console.error("Message template save failed:", error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: "Could not save the template." }, { status: 503 }); }
}

export const PATCH = signalled(["settings"], handlePATCH);
