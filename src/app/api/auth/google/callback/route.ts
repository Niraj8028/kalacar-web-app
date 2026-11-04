import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createCustomerSession, upsertGoogleCustomer } from "@/lib/catalogue-db";
import { SECURE_COOKIES, cookieFor, scopeFrom, type AuthScope } from "@/lib/customer-auth";
import { CALLBACK_PATH, OAUTH_STATE_COOKIE, googleConfig, isOwnerEmail, requestOrigin } from "@/lib/google-oauth";

type StoredRequest = { state: string; verifier: string; next: string; origin: string; scope?: AuthScope };
const stateCookies = [`${OAUTH_STATE_COOKIE}_customer`, `${OAUTH_STATE_COOKIE}_owner`, OAUTH_STATE_COOKIE];
const clearState = (response: NextResponse) => { for (const name of stateCookies) response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", secure: SECURE_COOKIES, path: "/api/auth/google", maxAge: 0 }); };

function fail(origin: string, next: string, reason: string) {
  const target = new URL(next, origin);
  target.searchParams.set("auth_error", reason);
  const response = NextResponse.redirect(target);
  clearState(response);
  return response;
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Google sign-in is only enabled in local development for now." }, { status: 403 });
  const config = googleConfig();
  const origin = requestOrigin(request);
  if (!config || !origin) return NextResponse.json({ error: "Google sign-in is not configured for this address." }, { status: 503 });

  // Pick the pending sign-in (shop or dashboard) whose state matches what Google sent back.
  const params = new URL(request.url).searchParams;
  const jar = await cookies();
  const pending = stateCookies.map(name => { try { return JSON.parse(jar.get(name)?.value ?? "null") as StoredRequest | null; } catch { return null; } }).filter((item): item is StoredRequest => Boolean(item));
  const stored = pending.find(item => item.state === params.get("state")) ?? pending[0] ?? null;
  const scope = scopeFrom(stored?.scope);
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

    // The dashboard session is only ever given to an owner-listed account.
    if (scope === "owner" && !isOwnerEmail(profile.email)) return fail(origin, next, "not_owner");
    const user = await upsertGoogleCustomer(profile.sub, profile.email.toLowerCase(), profile.name?.trim() || profile.email.split("@")[0]);
    const token = await createCustomerSession(user.id);
    const response = NextResponse.redirect(new URL(next, origin));
    response.cookies.set(cookieFor(scope), token, { httpOnly: true, sameSite: "lax", secure: SECURE_COOKIES, path: "/", maxAge: 60 * 60 * 24 * 7 });
    clearState(response);
    return response;
  } catch (error) {
    console.error("Google sign-in failed:", error instanceof Error ? error.message : "unknown error");
    return fail(origin, next, "unavailable");
  }
}
