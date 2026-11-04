import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findCustomerBySession } from "@/lib/catalogue-db";
import { isOwnerEmail } from "@/lib/google-oauth";

export const CUSTOMER_COOKIE = "kalacar_customer_session";
/**
 * The owner dashboard has its own session cookie. Cookies are shared by host, not port, so on
 * localhost the shop (:3000) and dashboard (:5173) would otherwise overwrite each other's sign-in.
 * Only an owner-listed Google account can get this cookie, and only through the dashboard sign-in.
 */
export const OWNER_COOKIE = "kalacar_owner_session";
export type AuthScope = "customer" | "owner";
export const scopeFrom = (value: string | null | undefined): AuthScope => value === "owner" ? "owner" : "customer";
export const cookieFor = (scope: AuthScope) => scope === "owner" ? OWNER_COOKIE : CUSTOMER_COOKIE;
/** Cookies are HTTPS-only in production; localhost uses plain http in development. */
export const SECURE_COOKIES = process.env.NODE_ENV === "production";
export async function currentCustomer() {
  if (process.env.NODE_ENV !== "development") return null;
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  return token ? findCustomerBySession(token) : null;
}

/** The account signed in to the owner dashboard (separate from whoever is signed in to the shop). */
export async function currentOwnerSession() {
  if (process.env.NODE_ENV !== "development") return null;
  const token = (await cookies()).get(OWNER_COOKIE)?.value;
  return token ? findCustomerBySession(token) : null;
}

/** Returns an error response unless the signed-in user is listed in KALACAR_OWNER_EMAILS. */
export async function requireOwner() {
  try {
    const user = await currentOwnerSession();
    if (!user) return NextResponse.json({ error: "Sign in as the shop owner to use the dashboard." }, { status: 401 });
    if (!isOwnerEmail(user.email)) return NextResponse.json({ error: "This account is not allowed to use the owner dashboard." }, { status: 403 });
    return null;
  } catch {
    return NextResponse.json({ error: "Account service is unavailable. Check the local database connection and try again." }, { status: 503 });
  }
}
