import { NextResponse } from "next/server";
import { MINUTE, limitOrNull } from "@/lib/rate-limit";
import { currentCustomer } from "@/lib/customer-auth";
import { toAddressFields } from "@/lib/geocode";
import type { GeocodeResult } from "@/lib/geocode";

// Turns a map pin (lat/lng) into address fields with Google's Geocoding API.
// The key stays on the server. Coordinates are never stored or logged.

const noStore = { "Cache-Control": "no-store" };
/** Rough bounding box for India, so we never geocode points elsewhere. */
const inIndia = (lat: number, lng: number) => lat >= 6 && lat <= 37.6 && lng >= 68 && lng <= 97.5;

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "Location lookup is only enabled in local development for now." }, { status: 403 });
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return NextResponse.json({ error: "Location lookup is not configured." }, { status: 503 });

  let user;
  try { user = await currentCustomer(); } catch { return NextResponse.json({ error: "Account service is unavailable." }, { status: 503 }); }
  if (!user) return NextResponse.json({ error: "Sign in to use your location." }, { status: 401 });
  const limited = limitOrNull([{ key: `location:user:${user.id}`, limit: 30, windowMs: MINUTE }], "Too many location lookups. Wait a minute and try again.");
  if (limited) return limited;

  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: "Invalid location." }, { status: 400 });
  if (!inIndia(lat, lng)) return NextResponse.json({ error: "We currently deliver only within India. Move the pin to your delivery address." }, { status: 422 });

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.search = new URLSearchParams({ latlng: `${lat.toFixed(6)},${lng.toFixed(6)}`, key, language: "en", region: "in" }).toString();
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const data = await response.json() as { status: string; results?: GeocodeResult[]; error_message?: string };
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      // Log Google's status (e.g. REQUEST_DENIED when billing/key setup is wrong) without coordinates.
      console.error("Reverse geocoding failed:", data.status, data.error_message?.slice(0, 200) ?? "");
      return NextResponse.json({ error: "Location lookup is unavailable right now. Please type your address." }, { status: 502, headers: noStore });
    }
    if (!data.results?.length) return NextResponse.json({ error: "We couldn't find an address here. Move the pin closer to a road or building." }, { status: 404, headers: noStore });
    const fields = toAddressFields(data.results);
    if (fields.country && fields.country !== "India") return NextResponse.json({ error: "We currently deliver only within India." }, { status: 422, headers: noStore });
    return NextResponse.json(fields, { headers: noStore });
  } catch (error) {
    console.error("Reverse geocoding failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Location lookup is unavailable right now. Please type your address." }, { status: 502, headers: noStore });
  }
}
