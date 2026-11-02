import { NextResponse } from "next/server";
import { listOrders } from "@/lib/catalogue-db";

export async function GET() {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Owner authentication is not configured." }, { status: 403 });
  try { return NextResponse.json({ orders: await listOrders() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) {
    console.error("Owner orders unavailable:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Orders are temporarily unavailable." }, { status: 503 });
  }
}
