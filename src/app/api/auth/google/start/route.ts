import { NextResponse } from "next/server";
import { MINUTE, clientIp, limitOrNull } from "@/lib/rate-limit";
import { SECURE_COOKIES, scopeFrom } from "@/lib/customer-auth";
import { CALLBACK_PATH, OAUTH_STATE_COOKIE, googleConfig, newOAuthRequest, requestOrigin, safeNextPath } from "@/lib/google-oauth";

export async function GET(request: Request) {

  const config = googleConfig();
  if (!config) return NextResponse.json({ error: "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." }, { status: 503 });
  const origin = requestOrigin(request);
  if (!origin) return NextResponse.json({ error: "Google sign-in isn't set up for this address." }, { status: 400 });

  const params = new URL(request.url).searchParams;
  const next = safeNextPath(params.get("next"));
  const scope = scopeFrom(params.get("scope"));
  // Counted per site, so sign-in attempts on the shop never lock the owner out of the dashboard.
  const limited = limitOrNull([{ key: `google:${scope}:ip:${clientIp(request)}`, limit: 30, windowMs: 10 * MINUTE }], "Too many sign-in attempts. Please wait a few minutes and try again.");
  if (limited) return limited;
  const { state, verifier, challenge } = newOAuthRequest();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: origin + CALLBACK_PATH,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const response = NextResponse.redirect(url);
  // One state cookie per scope, so a shop sign-in and a dashboard sign-in in progress at once don't clash.
  response.cookies.set(`${OAUTH_STATE_COOKIE}_${scope}`, JSON.stringify({ state, verifier, next, origin, scope }), { httpOnly: true, sameSite: "lax", secure: SECURE_COOKIES, path: "/api/auth/google", maxAge: 600 });
  return response;
}
