import { afterEach, describe, expect, it, vi } from "vitest";

const { GET } = await import("@/app/api/pincode/[pin]/route");
const call = (pin: string) => GET(new Request(`http://localhost/api/pincode/${pin}`, { headers: { "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` } }), { params: Promise.resolve({ pin }) });
const indiaPost = (body: unknown, status = 200) => vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe("PIN code lookup", () => {
  afterEach(() => vi.restoreAllMocks());
  it("fills city and state from India Post", async () => {
    indiaPost([{ Status: "Success", PostOffice: [{ Name: "Junnar", District: "Pune", State: "Maharashtra", Country: "India" }] }]);
    const response = await call("410502");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ found: true, city: "Pune", state: "Maharashtra" });
  });
  it("an India Post 'No records found' answer doesn't call a real PIN wrong", async () => {
    indiaPost([{ Message: "No records found", Status: "Error", PostOffice: null }]);
    const response = await call("110001");
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/couldn't check this PIN right now/);
  });
  it("India Post being down asks the customer to type city and state", async () => {
    indiaPost({}, 500);
    expect((await call("560001")).status).toBe(503);
  });
  it("refuses a PIN that isn't 6 digits or starts with 0", async () => {
    for (const pin of ["12345", "012345", "abcdef"]) expect((await call(pin)).status).toBe(400);
  });
});
