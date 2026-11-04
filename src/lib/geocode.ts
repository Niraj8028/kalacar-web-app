// Maps Google Geocoding results onto Kalacar's checkout address fields.

type Component = { long_name: string; short_name: string; types: string[] };
export type GeocodeResult = { formatted_address: string; address_components: Component[]; types: string[] };

function pick(components: Component[], ...types: string[]) {
  for (const type of types) {
    const match = components.find(c => c.types.includes(type));
    if (match) return match.long_name;
  }
  return "";
}

/** Maps Google's address parts onto Kalacar's checkout fields. */
export function toAddressFields(results: GeocodeResult[]) {
  // Prefer the most specific street-level result; fall back to the first.
  const best = results.find(r => r.types.some(t => ["street_address", "premise", "route", "subpremise"].includes(t))) ?? results[0];
  const components = best.address_components;
  const pincode = pick(components, "postal_code") || pick(results.flatMap(r => r.address_components), "postal_code");
  const city = pick(components, "locality", "administrative_area_level_3", "administrative_area_level_2");
  const state = pick(components, "administrative_area_level_1");
  const areaParts = [
    pick(components, "premise"),
    pick(components, "route"),
    pick(components, "neighborhood"),
    pick(components, "sublocality_level_3"),
    pick(components, "sublocality_level_2"),
    pick(components, "sublocality_level_1", "sublocality"),
  ].filter((part, index, all) => part && part !== city && all.indexOf(part) === index);
  return {
    address: areaParts.join(", "),
    city,
    state,
    pincode: /^[1-9]\d{5}$/.test(pincode) ? pincode : "",
    formatted: best.formatted_address,
    country: pick(components, "country"),
  };
}

