import { NextResponse } from "next/server";
import { MINUTE, clientIp, limitOrNull, reset } from "@/lib/rate-limit";
import { authenticateCustomer, createCustomerSession } from "@/lib/catalogue-db";
import { CUSTOMER_COOKIE, SECURE_COOKIES } from "@/lib/customer-auth";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "Invalid form." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  // Cap lengths before hashing: scrypt on a huge "password" would tie up the CPU.
  if (email.length > 190 || password.length > 128) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  const limited = limitOrNull([
    { key: `login:ip:${clientIp(request)}`, limit: 20, windowMs: 10 * MINUTE },
    { key: `login:email:${email}`, limit: 8, windowMs: 15 * MINUTE },
  ], "Too many sign-in attempts. Please wait a few minutes and try again.");
  if (limited) return limited;
  try {
    const user = await authenticateCustomer(email, password);
    if (!user) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    reset(`login:email:${email}`);
    const token = await createCustomerSession(user.id);
    const response = NextResponse.json({ user });
    response.cookies.set(CUSTOMER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: SECURE_COOKIES, path: "/", maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch {
    return NextResponse.json({ error: "Account service is unavailable. Check the local database connection and try again." }, { status: 503 });
  }
}
