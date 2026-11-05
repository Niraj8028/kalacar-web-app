import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteCustomerSession } from "@/lib/catalogue-db";
import { SECURE_COOKIES, cookieFor, scopeFrom } from "@/lib/customer-auth";

/** `?scope=owner` signs out of the dashboard only; otherwise the shop only. */
export async function POST(request: Request) {
  const name = cookieFor(scopeFrom(new URL(request.url).searchParams.get("scope")));
  const token = (await cookies()).get(name)?.value;
  if (token) await deleteCustomerSession(token).catch(() => undefined);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", secure: SECURE_COOKIES, path: "/", maxAge: 0 });
  return response;
}
