import { NextResponse } from "next/server";
import { authenticateCustomer, createCustomerSession } from "@/lib/catalogue-db";
import { CUSTOMER_COOKIE } from "@/lib/customer-auth";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Local customer accounts are disabled outside development." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "Invalid form." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  const user = await authenticateCustomer(email, password);
  if (!user) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  const token = await createCustomerSession(user.id);
  const response = NextResponse.json({ user });
  response.cookies.set(CUSTOMER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 60 * 60 * 24 * 7 });
  return response;
}
