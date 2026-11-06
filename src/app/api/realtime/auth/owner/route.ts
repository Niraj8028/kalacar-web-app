import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/customer-auth";
import { realtimeServer } from "@/lib/realtime";
import { ownerMayJoin } from "@/lib/realtime-channels";

/** Dashboard session only: a shop sign-in can never join the owner channel. */
export async function POST(request: Request) {
  const denied = await requireOwner();
  if (denied) return denied;
  const form = await request.formData().catch(() => null);
  const socketId = form?.get("socket_id"), channel = form?.get("channel_name");
  if (typeof socketId !== "string" || typeof channel !== "string") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (!ownerMayJoin(channel)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const pusher = realtimeServer();
  if (!pusher) return NextResponse.json({ error: "Live updates aren't set up." }, { status: 503 });
  return NextResponse.json(pusher.authorizeChannel(socketId, channel), { headers: { "Cache-Control": "no-store" } });
}
