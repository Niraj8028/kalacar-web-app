import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer-auth";

export async function GET() {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ user: null });
  return NextResponse.json({ user: await currentCustomer() }, { headers: { "Cache-Control": "no-store" } });
}
