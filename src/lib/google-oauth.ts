import { createHash, randomBytes } from "node:crypto";

// Only these origins may receive Google's redirect. Each needs a matching
// "Authorized redirect URI" (origin + CALLBACK_PATH) in Google Cloud Console.
// localhost:3000 = shop site (Next.js); localhost:5173 = owner dashboard (Vite proxy).
const ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:5173"];
export const CALLBACK_PATH = "/api/auth/google/callback";
export const OAUTH_STATE_COOKIE = "kalacar_google_oauth";

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** Origin the browser is on, taken from the Host header and checked against the allowlist. */
export function requestOrigin(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const origin = `http://${host}`;
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

/** Only allow same-site relative paths as the post-login destination. */
export function safeNextPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}

export function newOAuthRequest() {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

export function ownerEmails() {
  return (process.env.KALACAR_OWNER_EMAILS ?? "").split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
}

export function isOwnerEmail(email: string | null | undefined) {
  return Boolean(email) && ownerEmails().includes(email!.toLowerCase());
}
