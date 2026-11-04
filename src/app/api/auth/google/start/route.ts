import { NextResponse } from "next/server";
import { CALLBACK_PATH, OAUTH_STATE_COOKIE, googleConfig, newOAuthRequest, requestOrigin, safeNextPath } from "@/lib/google-oauth";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Google sign-in is only enabled in local development for now." }, { status: 403 });
  const config = googleConfig();
  if (!config) return NextResponse.json({ error: "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local." }, { status: 503 });
  const origin = requestOrigin(request);
  if (!origin) return NextResponse.json({ error: "Open the site at http://localhost:3000 (or the dashboard at http://localhost:5173) to use Google sign-in." }, { status: 400 });

  const next = safeNextPath(new URL(request.url).searchParams.get("next"));
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
  response.cookies.set(OAUTH_STATE_COOKIE, JSON.stringify({ state, verifier, next, origin }), { httpOnly: true, sameSite: "lax", secure: false, path: "/api/auth/google", maxAge: 600 });
  return response;
}
