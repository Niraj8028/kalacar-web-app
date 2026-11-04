import { NextResponse } from "next/server";

// Simple in-memory sliding-window limiter.
// Good for one server process (local dev, a single Hostinger Node app). If the app ever runs
// on several instances, move this to a shared store (e.g. Redis) — noted in the checklist.

const buckets = new Map<string, number[]>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hits] of buckets) if (!hits.length || now - hits[hits.length - 1] > 3_600_000) buckets.delete(key);
}

/** Records a hit; returns seconds to wait if the limit is exceeded, otherwise 0. */
export function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  sweep(now);
  const recent = (buckets.get(key) ?? []).filter(t => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000));
  }
  recent.push(now);
  buckets.set(key, recent);
  return 0;
}

/** Clears a key, e.g. after a successful sign-in so earlier typos don't count against the user. */
export function reset(key: string) { buckets.delete(key); }

/**
 * Client IP for rate limiting. Uses the LAST X-Forwarded-For entry (the one added by our nearest
 * proxy); earlier entries are client-supplied and could be faked to dodge limits. Confirm the
 * host's proxy header at deployment (checklist Stage 8A).
 */
export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map(part => part.trim()).filter(Boolean).at(-1);
  return forwarded || request.headers.get("x-real-ip") || "local";
}

/** Returns a 429 response if any of the given limits is exceeded, else null. */
export function limitOrNull(checks: Array<{ key: string; limit: number; windowMs: number }>, message = "Too many attempts. Please wait a moment and try again.") {
  for (const check of checks) {
    const wait = hit(check.key, check.limit, check.windowMs);
    if (wait) return NextResponse.json({ error: message, retryAfter: wait }, { status: 429, headers: { "Retry-After": String(wait) } });
  }
  return null;
}

export const MINUTE = 60_000;
