import { NextResponse } from "next/server";
import { MINUTE, clientIp, limitOrNull } from "@/lib/rate-limit";
import { createCustomerSession, findCustomerByEmail, redeemLoginLink } from "@/lib/catalogue-db";
import { CUSTOMER_COOKIE, SECURE_COOKIES } from "@/lib/customer-auth";
import { isEmail, normalEmail } from "@/lib/email-address";
import { sendSignInEmail } from "@/lib/customer-emails";

const SENT = "If that email has orders with us, a sign-in link is on its way. It expires in 30 minutes.";
const safeNext = (value: unknown) => typeof value === "string" && /^\/(?!\/)/.test(value) && value.length < 200 ? value : "/account";

/** Emails a one-time sign-in link. The answer is the same whether or not the email has an account. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "Invalid form." }, { status: 400 }); }
  const email = typeof body.email === "string" ? normalEmail(body.email) : "";
  if (!isEmail(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  const limited = limitOrNull([
    { key: `email-link:ip:${clientIp(request)}`, limit: 10, windowMs: 60 * MINUTE },
    { key: `email-link:email:${email}`, limit: 3, windowMs: 15 * MINUTE },
  ], "Too many sign-in links asked for. Please wait a few minutes and check your inbox.");
  if (limited) return limited;
  try {
    const user = await findCustomerByEmail(email);
    if (user) await sendSignInEmail(user, safeNext(body.next));
    return NextResponse.json({ ok: true, message: SENT });
  } catch (error) {
    console.error("Sign-in link failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "We couldn't send a sign-in link right now. Please try again in a few minutes." }, { status: 503 });
  }
}

/**
 * The account page sends the token from the emailed link. It is used up here, not when the link is opened,
 * because email apps open links to scan them before the customer does.
 */
export async function PUT(request: Request) {
  const limited = limitOrNull([{ key: `email-link-use:ip:${clientIp(request)}`, limit: 20, windowMs: 15 * MINUTE }], "Too many attempts. Please wait a few minutes.");
  if (limited) return limited;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "Invalid link." }, { status: 400 }); }
  const token = typeof body.token === "string" ? body.token : "";
  const user = /^[A-Za-z0-9_-]{43}$/.test(token) ? await redeemLoginLink(token).catch(() => null) : null;
  if (!user) return NextResponse.json({ error: "This sign-in link has expired or was already used. Ask for a new one below." }, { status: 410 });
  const session = await createCustomerSession(user.id);
  const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  response.cookies.set(CUSTOMER_COOKIE, session, { httpOnly: true, sameSite: "lax", secure: SECURE_COOKIES, path: "/", maxAge: 60 * 60 * 24 * 7 });
  return response;
}
