import { NextResponse } from "next/server";
import { MINUTE, clientIp, limitOrNull } from "@/lib/rate-limit";
import { createCustomer, createCustomerSession } from "@/lib/catalogue-db";
import { CUSTOMER_COOKIE, SECURE_COOKIES } from "@/lib/customer-auth";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Local customer accounts are disabled outside development." }, { status: 403 });
  const limited = limitOrNull([{ key: `register:ip:${clientIp(request)}`, limit: 5, windowMs: 60 * MINUTE }], "Too many accounts created from this connection. Please try again later.");
  if (limited) return limited;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "Invalid form." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (name.length < 2 || name.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.replace(/\D/g, "").length < 10 || password.length < 10 || password.length > 128) return NextResponse.json({ error: "Enter your name, valid email, phone, and a password of at least 10 characters." }, { status: 400 });
  try {
    const user = await createCustomer(name, email, phone, password);
    const token = await createCustomerSession(user.id);
    const response = NextResponse.json({ user });
    response.cookies.set(CUSTOMER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: SECURE_COOKIES, path: "/", maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY") return NextResponse.json({ error: "An account already uses this email. Sign in instead." }, { status: 409 });
    console.error("Customer registration failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Could not create your account right now." }, { status: 503 });
  }
}
