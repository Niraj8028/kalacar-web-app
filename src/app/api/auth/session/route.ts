import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer-auth";

export async function GET() {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ user: null });
  try {
    return NextResponse.json({ user: await currentCustomer() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ user: null, error: "Account service is unavailable. Check the local database connection and try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
