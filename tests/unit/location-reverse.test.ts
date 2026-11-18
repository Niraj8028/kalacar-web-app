import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const currentCustomer = vi.fn();
vi.mock("@/lib/customer-auth", () => ({ currentCustomer: () => currentCustomer() }));
const { GET } = await import("@/app/api/location/reverse/route");

// Pune; each test uses its own connection address so rate limits don't carry over.
const ask = (ip: string) => GET(new Request("http://localhost:3000/api/location/reverse?lat=18.52&lng=73.85", { headers: { "x-forwarded-for": ip } }));

describe("map pin to address", () => {
  beforeEach(() => {
    process.env.GOOGLE_MAPS_SERVER_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ status: "OK", results: [{ types: ["street_address"], formatted_address: "FC Road, Pune", address_components: [{ long_name: "Pune", types: ["locality"] }, { long_name: "Maharashtra", types: ["administrative_area_level_1"] }, { long_name: "411004", types: ["postal_code"] }, { long_name: "India", types: ["country"] }] }] })));
  });
  afterEach(() => { vi.unstubAllGlobals(); currentCustomer.mockReset(); });

  it("works for a guest at checkout", async () => {
    currentCustomer.mockResolvedValue(null);
    const response = await ask("10.0.0.1");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ pincode: "411004" });
  });

  it("still works when the account check fails", async () => {
    currentCustomer.mockRejectedValue(new Error("db down"));
    expect((await ask("10.0.0.2")).status).toBe(200);
  });

  it("limits guests per connection, since each lookup costs money", async () => {
    currentCustomer.mockResolvedValue(null);
    for (let i = 0; i < 15; i++) expect((await ask("10.0.0.3")).status).toBe(200);
    expect((await ask("10.0.0.3")).status).toBe(429);
  });
});
