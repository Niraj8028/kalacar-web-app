import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { findCustomerById, findCustomerOrder, findGuestOrder } from "@/lib/catalogue-db";
import { SECURE_COOKIES, currentCustomer } from "@/lib/customer-auth";

// A guest who checks out isn't signed in. This browser instead keeps a random token, and each guest order
// it places stores the token's hash, so only this browser can pay, check or see those orders.
export const GUEST_COOKIE = "kalacar_guest_orders";
const GUEST_DAYS = 30;

const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");

export async function guestTokenHash() {
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? hashOf(token) : null;
}

/** The token this browser already has, or a new one. Call `keep` on the response so the cookie is (re)saved. */
export async function guestToken() {
  const existing = (await cookies()).get(GUEST_COOKIE)?.value;
  const token = existing && /^[A-Za-z0-9_-]{43}$/.test(existing) ? existing : randomBytes(32).toString("base64url");
  return {
    hash: hashOf(token),
    keep: (response: NextResponse) => response.cookies.set(GUEST_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: SECURE_COOKIES, path: "/", maxAge: 60 * 60 * 24 * GUEST_DAYS }),
  };
}

/** The order, if the signed-in account owns it or this browser placed it as a guest, plus the account it belongs to. */
export async function orderForViewer(orderId: string) {
  const account = await currentCustomer();
  const owned = account ? await findCustomerOrder(orderId, account.id) : null;
  if (owned && account) return { order: owned, owner: account };
  const hash = await guestTokenHash();
  const guest = hash ? await findGuestOrder(orderId, hash) : null;
  const owner = guest?.userId ? await findCustomerById(guest.userId) : null;
  return guest && owner ? { order: guest, owner } : null;
}
