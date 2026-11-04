import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findCustomerBySession } from "@/lib/catalogue-db";
import { isOwnerEmail } from "@/lib/google-oauth";

export const CUSTOMER_COOKIE = "kalacar_customer_session";
export async function currentCustomer() {
  if (process.env.NODE_ENV !== "development") return null;
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  return token ? findCustomerBySession(token) : null;
}

/** Returns an error response unless the signed-in user is listed in KALACAR_OWNER_EMAILS. */
export async function requireOwner() {
  try {
    const user = await currentCustomer();
    if (!user) return NextResponse.json({ error: "Sign in as the shop owner to use the dashboard." }, { status: 401 });
    if (!isOwnerEmail(user.email)) return NextResponse.json({ error: "This account is not allowed to use the owner dashboard." }, { status: 403 });
    return null;
  } catch {
    return NextResponse.json({ error: "Account service is unavailable. Check the local database connection and try again." }, { status: 503 });
  }
}
