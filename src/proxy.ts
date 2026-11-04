import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// CSRF protection for the API: a request that changes data (POST/PUT/PATCH/DELETE) must come from
// a Kalacar page — the browser's Origin must match the host it is talking to. Session cookies are
// SameSite=Lax already; this closes the remaining gaps (e.g. sibling subdomains, old browsers).
//
// Exempt: the Razorpay webhook, which is a signed server-to-server call with no Origin.

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const EXEMPT_PREFIXES = ["/api/webhooks/"];

function sameOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;
  const origin = request.headers.get("origin");
  if (origin) {
    try { return new URL(origin).host === host; } catch { return false; }
  }
  // No Origin header: only accept what the browser itself marks as same-origin.
  return request.headers.get("sec-fetch-site") === "same-origin";
}

export function proxy(request: NextRequest) {
  if (!WRITE_METHODS.has(request.method)) return NextResponse.next();
  if (EXEMPT_PREFIXES.some(prefix => request.nextUrl.pathname.startsWith(prefix))) return NextResponse.next();
  if (sameOrigin(request)) return NextResponse.next();
  return NextResponse.json({ error: "This request didn't come from the Kalacar site, so it was blocked." }, { status: 403 });
}

export const config = { matcher: "/api/:path*" };
