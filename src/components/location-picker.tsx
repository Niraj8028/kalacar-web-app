"use client";

import { useEffect, useRef, useState } from "react";

export type LocationAddress = { address: string; city: string; state: string; pincode: string; formatted: string };

// Minimal typings for the parts of the Maps JavaScript API we use.
type LatLng = { lat(): number; lng(): number };
type GoogleMap = {
  getCenter(): LatLng | undefined;
  setCenter(point: { lat: number; lng: number }): void;
  setZoom(zoom: number): void;
  getZoom(): number | undefined;
  addListener(event: string, handler: () => void): { remove(): void };
};
type MapsNamespace = { maps: { Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap } };
declare global { interface Window { google?: MapsNamespace; __kalacarMapsReady?: () => void } }

const BROWSER_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? "";
const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

let mapsPromise: Promise<MapsNamespace> | null = null;
/** Loads the Maps JavaScript API once per page, only when a customer asks for it. */
function loadMaps(): Promise<MapsNamespace> {
  if (window.google?.maps?.Map) return Promise.resolve(window.google);
  mapsPromise ??= new Promise((resolve, reject) => {
    window.__kalacarMapsReady = () => (window.google?.maps?.Map ? resolve(window.google) : reject(new Error("Maps failed to load")));
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(BROWSER_KEY)}&v=weekly&loading=async&region=IN&language=en&callback=__kalacarMapsReady`;
    script.async = true;
    script.onerror = () => { mapsPromise = null; reject(new Error("Maps failed to load")); };
    document.head.appendChild(script);
  });
  return mapsPromise;
}

function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("unsupported")); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      error => reject(new Error(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
}

/**
 * "Use my current location": opens a map centred on the customer with a fixed pin,
 * lets them drag the map to the exact spot, and hands back the address under the pin.
 */
export function LocationPicker({ onUse }: { onUse: (address: LocationAddress) => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "locating" | "loading" | "ready" | "looking" | "error">("idle");
  const [message, setMessage] = useState("");
  const [found, setFound] = useState<LocationAddress | null>(null);
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<GoogleMap | null>(null);
  const lookup = useRef(0);
  const debounce = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(debounce.current), []);

  if (!BROWSER_KEY) return null;

  async function describe(point: LatLng) {
    const ticket = ++lookup.current;
    setStatus("looking"); setMessage("");
    try {
      const response = await fetch(`/api/location/reverse?lat=${point.lat().toFixed(6)}&lng=${point.lng().toFixed(6)}`, { cache: "no-store" });
      const data = await response.json() as LocationAddress & { error?: string };
      if (ticket !== lookup.current) return; // a newer pin position won
      if (!response.ok) throw new Error(data.error || "We couldn't read an address here.");
      setFound(data); setStatus("ready");
    } catch (error) {
      if (ticket !== lookup.current) return;
      setFound(null); setStatus("error");
      setMessage(error instanceof Error ? error.message : "We couldn't read an address here.");
    }
  }

  async function start() {
    setOpen(true); setFound(null); setMessage(""); setStatus("locating");
    let center = INDIA_CENTER;
    let zoom = 5;
    try { center = await currentPosition(); zoom = 18; }
    catch (error) {
      setMessage(error instanceof Error && error.message === "denied"
        ? "Location access is off. Move the map to your address, or allow location in your browser settings."
        : "We couldn't get your location. Move the map to your address.");
    }
    setStatus("loading");
    try {
      const google = await loadMaps();
      if (!mapElement.current) return;
      if (!map.current) {
        map.current = new google.maps.Map(mapElement.current, {
          center, zoom, disableDefaultUI: true, zoomControl: true, gestureHandling: "greedy", clickableIcons: false,
        });
        map.current.addListener("idle", () => {
          window.clearTimeout(debounce.current);
          debounce.current = window.setTimeout(() => {
            const point = map.current?.getCenter();
            if (point && (map.current?.getZoom() ?? 0) >= 14) void describe(point);
            else { setFound(null); setStatus("ready"); setMessage(m => m || "Zoom in and move the map so the pin sits on your building."); }
          }, 450);
        });
      } else { map.current.setCenter(center); map.current.setZoom(zoom); }
      setStatus("ready");
    } catch {
      setStatus("error");
      setMessage("The map couldn't load. Please type your address below.");
    }
  }

  return <div className="location-picker">
    {!open
      ? <button type="button" className="location-button" onClick={() => void start()}><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></svg>Use my current location</button>
      : <div className="location-panel">
        <div className="location-map-wrap">
          <div ref={mapElement} className="location-map" role="application" aria-label="Map. Drag to place the pin on your delivery address." />
          <span className="location-pin" aria-hidden="true" />
          {(status === "locating" || status === "loading") && <span className="location-overlay" role="status">{status === "locating" ? "Finding you…" : "Loading map…"}</span>}
        </div>
        <p className="location-hint">Drag the map so the pin sits on your building.</p>
        <div className="location-result" aria-live="polite">
          {status === "looking" ? <p>Reading the address…</p>
            : found ? <><strong>Deliver near</strong><p>{found.formatted}</p></>
            : message ? <p className="location-message">{message}</p> : null}
        </div>
        <div className="location-actions">
          <button type="button" className="checkout-demo-button" disabled={!found || status === "looking"} onClick={() => { if (found) { onUse(found); setOpen(false); } }}>Use this address</button>
          <button type="button" className="address-link" onClick={() => setOpen(false)}>Close map</button>
        </div>
        <p className="location-note">Your location is only used to fill in this form. It isn’t saved. Add your flat or house number yourself.</p>
      </div>}
  </div>;
}
