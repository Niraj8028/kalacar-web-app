import { NextResponse } from "next/server";
import { currentOwnerSession, requireOwner } from "@/lib/customer-auth";
import { parsePushDevice, pushPublicKey, removePushDevice, savePushDevice } from "@/lib/owner-alerts";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const denied = await requireOwner();
  if (denied) return denied;
  return NextResponse.json({ publicKey: pushPublicKey() }, { headers: noStore });
}

export async function POST(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;
  const device = parsePushDevice(await request.json().catch(() => null));
  if (!device) return NextResponse.json({ error: "This browser's alert details couldn't be used." }, { status: 400 });
  try {
    const owner = await currentOwnerSession();
    if (!owner?.email || !await savePushDevice(device, owner.email)) return NextResponse.json({ error: "Too many devices have alerts on. Turn alerts off on one first." }, { status: 409 });
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch { return NextResponse.json({ error: "Could not turn on alerts. Try again." }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;
  const body = await request.json().catch(() => null) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") return NextResponse.json({ error: "Choose a device." }, { status: 400 });
  try { await removePushDevice(body.endpoint); return NextResponse.json({ ok: true }, { headers: noStore }); }
  catch { return NextResponse.json({ error: "Could not turn off alerts. Try again." }, { status: 503 }); }
}
