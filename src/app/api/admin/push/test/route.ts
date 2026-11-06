import { NextResponse } from "next/server";
import { currentOwnerSession, requireOwner } from "@/lib/customer-auth";
import { sendTestPush } from "@/lib/owner-alerts";

export async function POST(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;
  const body = await request.json().catch(() => null) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") return NextResponse.json({ error: "Turn on alerts first." }, { status: 400 });
  try {
    const owner = await currentOwnerSession();
    const delivered = owner?.email ? await sendTestPush(body.endpoint, owner.email) : 0;
    return delivered ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "The test alert couldn't be sent. Turn alerts off and on again." }, { status: 502 });
  } catch { return NextResponse.json({ error: "The test alert couldn't be sent." }, { status: 503 }); }
}
