import { NextResponse } from "next/server";
import { currentCustomer, currentOwnerSession, scopeFrom } from "@/lib/customer-auth";
import { googleConfig, isOwnerEmail } from "@/lib/google-oauth";

/** `?scope=owner` (the dashboard) reads the dashboard session; otherwise the shop session. */
export async function GET(request: Request) {
  try {
    const user = scopeFrom(new URL(request.url).searchParams.get("scope")) === "owner" ? await currentOwnerSession() : await currentCustomer();
    return NextResponse.json({ user, isOwner: isOwnerEmail(user?.email), googleEnabled: Boolean(googleConfig()) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ user: null, error: "Sign-in isn't available right now. Please try again in a few minutes." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
