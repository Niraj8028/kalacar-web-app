import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer-auth";
import { googleConfig, isOwnerEmail } from "@/lib/google-oauth";

export async function GET() {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ user: null });
  try {
    const user = await currentCustomer();
    return NextResponse.json({ user, isOwner: isOwnerEmail(user?.email), googleEnabled: Boolean(googleConfig()) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ user: null, error: "Account service is unavailable. Check the local database connection and try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
