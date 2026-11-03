import { NextResponse } from "next/server";
import { getAdminMetrics } from "@/lib/catalogue-db";

export async function GET() {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Owner authentication is not configured." }, { status: 403 });
  try {
    return NextResponse.json(await getAdminMetrics(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Owner dashboard metrics unavailable:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Dashboard metrics are temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
