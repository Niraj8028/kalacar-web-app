import { NextResponse } from "next/server";
import { MINUTE, clientIp, limitOrNull } from "@/lib/rate-limit";

// PIN code → district/city and state, from India Post's free public data (api.postalpincode.in).
// Results are cached in memory: a day for found PINs, an hour for unknown ones.

type Lookup = { found: true; pincode: string; city: string; state: string; areas: string[] } | { found: false; pincode: string } | { unavailable: true };
const UNAVAILABLE = "We couldn't check this PIN right now. Please type the city and state.";
const respond = (value: Lookup) => "unavailable" in value ? NextResponse.json({ error: UNAVAILABLE }, { status: 503 }) : NextResponse.json(value, { status: value.found ? 200 : 404 });
const cache = new Map<string, { value: Lookup; expires: number }>();
const DAY = 24 * 60 * MINUTE;

type PostOffice = { Name?: string; District?: string; State?: string; Country?: string };

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

export async function GET(request: Request, { params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params;
  if (!/^[1-9]\d{5}$/.test(pin)) return NextResponse.json({ error: "Enter a valid 6-digit PIN code." }, { status: 400 });

  const cached = cache.get(pin);
  if (cached && cached.expires > Date.now()) return respond(cached.value);

  const limited = limitOrNull([{ key: `pincode:ip:${clientIp(request)}`, limit: 60, windowMs: 10 * MINUTE }], "Too many PIN lookups. Please type the city and state.");
  if (limited) return limited;

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error(`India Post answered ${response.status}`);
    const data = await response.json() as Array<{ Status?: string; PostOffice?: PostOffice[] | null }>;
    const offices = (data[0]?.PostOffice ?? []).filter(office => !office.Country || office.Country === "India");
    let value: Lookup;
    if (data[0]?.Status === "Success" && offices.length) {
      value = {
        found: true, pincode: pin,
        city: mostCommon(offices.map(office => office.District?.trim() ?? "")),
        state: mostCommon(offices.map(office => office.State?.trim() ?? "")),
        areas: [...new Set(offices.map(office => office.Name?.trim() ?? "").filter(Boolean))].slice(0, 25),
      };
    } else if (data[0]?.Status === "Error") {
      // India Post answers "No records found" for every PIN during its outages (seen 2026-11-09),
      // so a real PIN would look wrong. Say we couldn't check, and try again in 10 minutes.
      value = { unavailable: true };
    } else value = { found: false, pincode: pin };
    cache.set(pin, { value, expires: Date.now() + ("unavailable" in value ? 10 * MINUTE : value.found ? DAY : DAY / 24) });
    if (cache.size > 5000) cache.delete(cache.keys().next().value as string);
    return respond(value);
  } catch (error) {
    console.error("PIN lookup failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }
}
