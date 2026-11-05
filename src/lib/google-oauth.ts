import { createHash, randomBytes } from "node:crypto";
import { allowedOrigin } from "@/lib/public-origin";

export const CALLBACK_PATH = "/api/auth/google/callback";
export const OAUTH_STATE_COOKIE = "kalacar_google_oauth";

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** Origin the browser is on, checked against the allowlist in public-origin.ts. */
export function requestOrigin(request: Request) {
  return allowedOrigin(request.headers);
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
