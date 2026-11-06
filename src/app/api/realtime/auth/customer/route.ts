import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer-auth";
import { realtimeServer } from "@/lib/realtime";
import { customerMayJoin } from "@/lib/realtime-channels";

/** Shop session only: a customer can listen to their own channel and no one else's. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const socketId = form?.get("socket_id"), channel = form?.get("channel_name");
  if (typeof socketId !== "string" || typeof channel !== "string") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const pusher = realtimeServer();
  if (!pusher) return NextResponse.json({ error: "Live updates aren't set up." }, { status: 503 });
  try {
    const customer = await currentCustomer();
    if (!customer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    if (!customerMayJoin(channel, customer.id)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    return NextResponse.json(pusher.authorizeChannel(socketId, channel), { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Account service is unavailable." }, { status: 503 }); }
}
