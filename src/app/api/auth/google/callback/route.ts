import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createCustomerSession, upsertGoogleCustomer } from "@/lib/catalogue-db";
import { CUSTOMER_COOKIE } from "@/lib/customer-auth";
import { CALLBACK_PATH, OAUTH_STATE_COOKIE, googleConfig, requestOrigin } from "@/lib/google-oauth";

type StoredRequest = { state: string; verifier: string; next: string; origin: string };

function fail(origin: string, next: string, reason: string) {
  const target = new URL(next, origin);
  target.searchParams.set("auth_error", reason);
  const response = NextResponse.redirect(target);
  response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
  return response;
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Google sign-in is only enabled in local development for now." }, { status: 403 });
  const config = googleConfig();
  const origin = requestOrigin(request);
  if (!config || !origin) return NextResponse.json({ error: "Google sign-in is not configured for this address." }, { status: 503 });

  let stored: StoredRequest | null = null;
  try { stored = JSON.parse((await cookies()).get(OAUTH_STATE_COOKIE)?.value ?? "null") as StoredRequest | null; } catch { stored = null; }
  const params = new URL(request.url).searchParams;
  const next = stored?.next ?? "/";
  if (params.get("error")) return fail(origin, next, "cancelled");
  const code = params.get("code");
  if (!stored || !code || stored.origin !== origin || params.get("state") !== stored.state) return fail(origin, next, "expired");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: origin + CALLBACK_PATH, grant_type: "authorization_code", code_verifier: stored.verifier }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) {
      console.error("Google token exchange failed:", tokenResponse.status, (await tokenResponse.text()).slice(0, 300));
      return fail(origin, next, "google");
    }
    const { access_token: accessToken } = await tokenResponse.json() as { access_token?: string };
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (!profileResponse.ok) return fail(origin, next, "google");
    const profile = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
    if (!profile.sub || !profile.email || profile.email_verified !== true) return fail(origin, next, "unverified");

    const user = await upsertGoogleCustomer(profile.sub, profile.email.toLowerCase(), profile.name?.trim() || profile.email.split("@")[0]);
    const token = await createCustomerSession(user.id);
    const response = NextResponse.redirect(new URL(next, origin));
    response.cookies.set(CUSTOMER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 60 * 60 * 24 * 7 });
    response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Google sign-in failed:", error instanceof Error ? error.message : "unknown error");
    return fail(origin, next, "unavailable");
  }
}
