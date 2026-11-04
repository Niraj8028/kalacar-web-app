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

// Upper bounds on request bodies: product photo uploads (5 × 5 MB + form fields) vs. everything else.
const MAX_UPLOAD_BYTES = 26 * 1024 * 1024;
const MAX_JSON_BYTES = 100 * 1024;

export function proxy(request: NextRequest) {
  if (!WRITE_METHODS.has(request.method)) return NextResponse.next();
  const length = Number(request.headers.get("content-length") ?? "0");
  const multipart = (request.headers.get("content-type") ?? "").includes("multipart/form-data");
  if (length > (multipart && request.nextUrl.pathname.startsWith("/api/admin/products") ? MAX_UPLOAD_BYTES : MAX_JSON_BYTES)) {
    return NextResponse.json({ error: "This request is too large." }, { status: 413 });
  }
  if (EXEMPT_PREFIXES.some(prefix => request.nextUrl.pathname.startsWith(prefix))) return NextResponse.next();
  if (sameOrigin(request)) return NextResponse.next();
  return NextResponse.json({ error: "This request didn't come from the Kalacar site, so it was blocked." }, { status: 403 });
}

export const config = { matcher: "/api/:path*" };
