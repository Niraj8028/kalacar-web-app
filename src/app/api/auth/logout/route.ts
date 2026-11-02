import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteCustomerSession } from "@/lib/catalogue-db";
import { CUSTOMER_COOKIE } from "@/lib/customer-auth";

export async function POST() {
  if (process.env.NODE_ENV === "development") {
    const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
    if (token) await deleteCustomerSession(token);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 0 });
  return response;
}
